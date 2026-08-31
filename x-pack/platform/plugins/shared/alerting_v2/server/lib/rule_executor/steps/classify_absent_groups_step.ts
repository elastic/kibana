/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { getNoDataEsqlQuery, getRecoverEsqlQuery } from '@kbn/alerting-v2-schemas';
import { PluginInitializer } from '@kbn/core-di-server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { PluginConfig } from '../../../config';
import type { PipelineStateStream, RuleExecutionStep, RulePipelineState } from '../types';
import {
  buildContinuedBreachAlertEvents,
  buildNoDataAlertEvents,
  buildRecoveryAlertEvents,
  resolveAlertEventType,
} from '../build_alert_events';
import { detectDataPresence } from '../detect_data_presence';
import { executeRecoveryQuery } from '../execute_recovery_query';
import { fetchActiveAlertGroupHashes } from '../fetch_active_alert_group_hashes';
import { forwardThenFinalize } from '../stream_utils';
import {
  QueryServiceInternalToken,
  QueryServiceScopedSpaceRoutingToken,
} from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import type { ActiveAlertGroupHash } from '../queries';
import type { RuleResponse } from '../../rules_client';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';

/**
 * End-of-stream classifier for active groups that are **absent from the
 * full-run breach set**.
 *
 * Recovery and no-data are absence-based classifications: they are only correct
 * once the executor has seen the breach set for the whole run. This step
 * therefore:
 *
 * 1. forwards every upstream breach batch unchanged (so `DirectorStep` and
 *    `StoreAlertEventsStep` keep processing breaches per batch — streaming is
 *    preserved), while accumulating a local `Set<string>` of breached group
 *    hashes and capturing the latest pipeline state; and
 * 2. once the upstream stream drains, computes recovery + no-data +
 *    continued-breach events once against the accumulated breach set and emits
 *    them as a single final `continue` batch back into the same stream.
 *
 * Because that final batch flows through the same downstream steps, no group
 * that breaches anywhere this run is ever emitted as `recovered`/`recovering`,
 * removing the spurious per-batch recovery documents produced by the previous
 * per-batch steps.
 *
 * Unlike most steps this is **not** a `guardedExpandStep` (which runs the
 * handler per state). The forward-fold-then-emit-on-drain plumbing lives in
 * `forwardThenFinalize` (`stream_utils.ts`) — the emit-on-drain counterpart to
 * `withAtLeastOne` — so this step only declares *what* to accumulate (the
 * breach set) and *how* to finalize (classify the absent groups).
 */
@injectable()
export class ClassifyAbsentGroupsStep implements RuleExecutionStep {
  public readonly name = 'classify_absent_groups';

  private readonly maxQueryResponseSize: number;
  private readonly maxActiveGroups: number;

  constructor(
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract,
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly scopedQueryService: QueryServiceContract,
    @inject(PluginInitializer('config'))
    pluginConfigAccessor: PluginInitializerContext<PluginConfig>['config']
  ) {
    const { run } = pluginConfigAccessor.get<PluginConfig>().rules;
    this.maxQueryResponseSize = run.query.maxResponseSize;
    this.maxActiveGroups = run.alerts.max;
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const stepName = this.name;

    return forwardThenFinalize(streamState, {
      // Accumulate the full-run breach set as batches stream through.
      seed: new Set<string>(),
      accumulate: (breachedGroupHashes, state) => {
        for (const event of state.alertEventsBatch ?? []) {
          if (event.status === 'breached') {
            breachedGroupHashes.add(event.group_hash);
          }
        }
        return breachedGroupHashes;
      },
      // Runs once, after the query stream is fully drained.
      finalize: async (breachedGroupHashes, lastState) => {
        const finalBatch = await this.classify(lastState, breachedGroupHashes);
        if (finalBatch.length === 0) {
          return undefined;
        }

        lastState.logger.withLabels({ step: stepName }).debug({
          message: 'Emitting absence-based alert events',
        });

        return {
          type: 'continue',
          state: { ...lastState, alertEventsBatch: finalBatch },
        };
      },
    });
  }

  private async classify(
    state: RulePipelineState,
    breachedGroupHashes: ReadonlySet<string>
  ): Promise<AlertEvent[]> {
    const { rule, input } = state;

    if (rule?.kind !== 'alert') {
      return [];
    }

    const recoveryEnabled = rule.recovery_strategy != null && rule.recovery_strategy !== 'none';
    const noDataEnabled = getNoDataEsqlQuery(rule.query, rule.no_data_strategy) != null;

    if (!recoveryEnabled && !noDataEnabled) {
      return [];
    }

    // Reuse the active groups already fetched by `FetchActiveGroupsStep`.
    // Falls back to a fetch in case they were not threaded onto state
    const activeGroups = state.activeGroups
      ? [...state.activeGroups]
      : await fetchActiveAlertGroupHashes(
          this.internalQueryService,
          rule.id,
          input.executionContext,
          this.maxActiveGroups
        );

    if (activeGroups.length === 0) {
      return [];
    }

    // Data presence — one query for the whole run.
    const dataPresentGroupHashes = noDataEnabled
      ? await detectDataPresence({
          queryService: this.scopedQueryService,
          rule,
          input,
          logger: state.logger.withLabels({ step: this.name }),
          maxResponseSize: this.maxQueryResponseSize,
        })
      : undefined;

    // Recovery — recovered events for active groups NOT in the full breach set.
    const recoveryEvents = recoveryEnabled
      ? await this.buildRecovery({
          rule,
          input,
          activeGroups,
          breachedGroupHashes,
          dataPresentGroupHashes,
          logger: state.logger.withLabels({ step: this.name }),
        })
      : [];

    // No-data — classify active groups absent from breach AND not recovered above.
    const recoveredGroupHashes = new Set(recoveryEvents.map((event) => event.group_hash));
    const noDataEvents = dataPresentGroupHashes
      ? this.buildNoDataAndContinuedBreach({
          rule,
          input,
          activeGroups,
          breachedGroupHashes,
          recoveredGroupHashes,
          dataPresentGroupHashes,
        })
      : [];

    return [...recoveryEvents, ...noDataEvents];
  }

  private async buildRecovery({
    rule,
    input,
    activeGroups,
    breachedGroupHashes,
    dataPresentGroupHashes,
    logger,
  }: {
    rule: RuleResponse;
    input: RulePipelineState['input'];
    activeGroups: ActiveAlertGroupHash[];
    breachedGroupHashes: ReadonlySet<string>;
    dataPresentGroupHashes?: ReadonlySet<string>;
    logger: RulePipelineState['logger'];
  }): Promise<AlertEvent[]> {
    const effectiveQuery = getRecoverEsqlQuery(rule.query, rule.recovery_strategy);

    if (effectiveQuery) {
      return executeRecoveryQuery({
        queryService: this.scopedQueryService,
        logger,
        rule,
        effectiveQuery,
        input,
        activeGroupHashes: activeGroups,
        breachedGroupHashes,
        maxResponseSize: this.maxQueryResponseSize,
      });
    }

    return buildRecoveryAlertEvents({
      ruleId: rule.id,
      ruleVersion: rule.metadata.version,
      spaceId: input.spaceId,
      activeGroupHashes: activeGroups,
      breachedGroupHashes,
      dataPresentGroupHashes,
      scheduledTimestamp: input.scheduledAt,
      type: resolveAlertEventType(rule),
    });
  }

  /**
   * Partitions the active-but-absent groups that recovery did not resolve into
   * `no_data` and continued-`breached` sets and builds their events. Mirrors
   * the previous `CreateNoDataEventsStep`, now over full-run sets.
   */
  private buildNoDataAndContinuedBreach({
    rule,
    input,
    activeGroups,
    breachedGroupHashes,
    recoveredGroupHashes,
    dataPresentGroupHashes,
  }: {
    rule: RuleResponse;
    input: RulePipelineState['input'];
    activeGroups: ActiveAlertGroupHash[];
    breachedGroupHashes: ReadonlySet<string>;
    recoveredGroupHashes: ReadonlySet<string>;
    dataPresentGroupHashes: ReadonlySet<string>;
  }): AlertEvent[] {
    const unresolvedAbsentGroups = activeGroups
      .map(({ group_hash: groupHash }) => groupHash)
      .filter(
        (groupHash) => !breachedGroupHashes.has(groupHash) && !recoveredGroupHashes.has(groupHash)
      );

    if (unresolvedAbsentGroups.length === 0) {
      return [];
    }

    const noDataGroupHashes: string[] = [];
    const continuedBreachGroupHashes: string[] = [];

    for (const groupHash of unresolvedAbsentGroups) {
      if (!dataPresentGroupHashes.has(groupHash)) {
        noDataGroupHashes.push(groupHash);
      } else if (rule.recovery_strategy === 'query') {
        // Data present but neither breach nor recovery matched: keep breaching
        // until the recovery threshold is met.
        continuedBreachGroupHashes.push(groupHash);
      }
    }

    const events: AlertEvent[] = [];
    const eventType = resolveAlertEventType(rule);

    if (noDataGroupHashes.length > 0) {
      events.push(
        ...buildNoDataAlertEvents({
          ruleId: rule.id,
          ruleVersion: rule.metadata.version,
          spaceId: input.spaceId,
          groupHashes: noDataGroupHashes,
          scheduledTimestamp: input.scheduledAt,
          type: eventType,
        })
      );
    }

    if (continuedBreachGroupHashes.length > 0) {
      events.push(
        ...buildContinuedBreachAlertEvents({
          ruleId: rule.id,
          ruleVersion: rule.metadata.version,
          spaceId: input.spaceId,
          groupHashes: continuedBreachGroupHashes,
          scheduledTimestamp: input.scheduledAt,
          type: eventType,
        })
      );
    }

    return events;
  }
}
