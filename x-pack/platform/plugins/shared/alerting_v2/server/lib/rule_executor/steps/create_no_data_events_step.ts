/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  buildContinuedBreachAlertEvents,
  buildNoDataAlertEvents,
  resolveAlertEventType,
} from '../build_alert_events';
import { fetchActiveAlertGroupHashes } from '../fetch_active_alert_group_hashes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { guardedExpandStep } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';

/**
 * Classifies active groups that are absent from the current breach batch using
 * the data-presence result produced by {@link DetectDataPresenceStep}, and
 * appends the appropriate rule events.
 *
 * Recovery takes priority: groups that already have an upstream `recovered`
 * event are left untouched. For the remaining absent groups:
 *
 * - No data: append a `no_data` event.
 * - Data present and `recovery_strategy: 'query'`: append a continued
 *   `breached` event, so the rule keeps breaching until the
 *   user's recovery threshold is met.
 */
@injectable()
export class CreateNoDataEventsStep implements RuleExecutionStep {
  public readonly name = 'create_no_data_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule', 'alertEventsBatch'], async function* (state) {
      const { input, rule, alertEventsBatch, dataPresentGroupHashes } = state;

      if (rule.kind !== 'alert') {
        step.logger.debug({
          message: `[${step.name}] Skipping no-data handling for non-alert rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      if (dataPresentGroupHashes == null) {
        step.logger.debug({
          message: `[${step.name}] No data-presence result for rule ${input.ruleId}; skipping no-data handling`,
        });
        yield { type: 'continue', state };
        return;
      }

      const activeGroups = await fetchActiveAlertGroupHashes(
        step.internalQueryService,
        rule.id,
        input.executionContext
      );

      if (activeGroups.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No active alerts to evaluate for rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const breachedGroupHashes = new Set<string>();
      const recoveredGroupHashes = new Set<string>();
      for (const event of alertEventsBatch) {
        if (event.status === 'breached') {
          breachedGroupHashes.add(event.group_hash);
        } else if (event.status === 'recovered') {
          recoveredGroupHashes.add(event.group_hash);
        }
      }

      // Active-but-absent groups that recovery did not already resolve.
      const unresolvedAbsentGroups = activeGroups
        .map(({ group_hash }) => group_hash)
        .filter(
          (groupHash) => !breachedGroupHashes.has(groupHash) && !recoveredGroupHashes.has(groupHash)
        );

      if (unresolvedAbsentGroups.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No unresolved absent groups for rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const eventsToAppend = step.classifyAbsentGroups({
        rule,
        unresolvedAbsentGroups,
        dataPresentGroupHashes,
        scheduledTimestamp: input.scheduledAt,
        spaceId: input.spaceId,
      });

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch: [...alertEventsBatch, ...eventsToAppend] },
      };
    });
  }

  /**
   * Partitions the unresolved absent groups into no-data and continued-breach
   * sets and builds their events.
   */
  private classifyAbsentGroups({
    rule,
    unresolvedAbsentGroups,
    dataPresentGroupHashes,
    scheduledTimestamp,
    spaceId,
  }: {
    rule: RuleResponse;
    unresolvedAbsentGroups: string[];
    dataPresentGroupHashes: ReadonlySet<string>;
    scheduledTimestamp: string;
    spaceId: string;
  }): AlertEvent[] {
    const noDataGroupHashes: string[] = [];
    const continuedBreachGroupHashes: string[] = [];

    for (const groupHash of unresolvedAbsentGroups) {
      if (!dataPresentGroupHashes.has(groupHash)) {
        noDataGroupHashes.push(groupHash);
      } else if (rule.recovery_strategy === 'query') {
        // Data present but neither breach nor recovery matched: keep breaching until the recovery threshold is met.
        continuedBreachGroupHashes.push(groupHash);
      }
    }

    const events: AlertEvent[] = [];

    const eventType = resolveAlertEventType(rule);

    if (noDataGroupHashes.length > 0) {
      events.push(
        ...buildNoDataAlertEvents({
          ruleId: rule.id,
          ruleVersion: 1,
          spaceId,
          groupHashes: noDataGroupHashes,
          scheduledTimestamp,
          type: eventType,
        })
      );
    }

    if (continuedBreachGroupHashes.length > 0) {
      events.push(
        ...buildContinuedBreachAlertEvents({
          ruleId: rule.id,
          ruleVersion: 1,
          spaceId,
          groupHashes: continuedBreachGroupHashes,
          scheduledTimestamp,
          type: eventType,
        })
      );
    }

    return events;
  }
}
