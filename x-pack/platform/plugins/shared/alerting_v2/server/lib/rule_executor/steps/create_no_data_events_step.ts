/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { stableStringify } from '@kbn/std';
import { getNoDataEsqlQuery } from '@kbn/alerting-v2-schemas';
import { isEsqlUserError } from '../../errors/esql_user_error';
import type { PipelineStateStream, RuleExecutionStep, RulePipelineState } from '../types';
import {
  buildGroupHash,
  buildNoDataAlertEvents,
  buildRecoveryAlertEvents,
  createAlertEventsBatchBuilder,
  rowToDocument,
} from '../build_alert_events';
import { getQueryPayload } from '../get_query_payload';
import { fetchActiveAlertGroupHashes } from '../fetch_active_alert_group_hashes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
} from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { guardedExpandStep } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';

/**
 * Post-processes the alert events batch produced by {@link CreateAlertEventsStep}
 * and {@link CreateRecoveryEventsStep} to apply the rule's `no_data_strategy`.
 *
 * For each group that was previously active but is absent from the current
 * breach batch, this step decides whether the absence is because the group
 * has data but is not breaching, or because the group has no data at all.
 *
 * The `no_data` ES|QL query (when configured on standalone-format rules)
 * defines the set of groups that have data. Groups absent from that result
 * are treated as "no data" and the rule's `no_data_strategy` decides the
 * outcome (emit a `no_data` event, force recovery, etc.).
 */
@injectable()
export class CreateNoDataEventsStep implements RuleExecutionStep {
  public readonly name = 'create_no_data_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract,
    @inject(QueryServiceScopedToken) private readonly scopedQueryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule', 'alertEventsBatch'], async function* (state) {
      const { input, rule, alertEventsBatch } = state;

      if (rule.kind !== 'alert') {
        step.logger.debug({
          message: `[${step.name}] Skipping no-data handling for non-alert rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const noDataDisabled = rule.no_data_strategy == null || rule.no_data_strategy === 'none';
      const recoveryDisabled = rule.recovery_strategy == null || rule.recovery_strategy === 'none';

      if (noDataDisabled && recoveryDisabled) {
        step.logger.debug({
          message: `[${step.name}] No-data and recovery both disabled for rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      if (noDataDisabled) {
        step.logger.debug({
          message: `[${step.name}] No-data disabled for rule ${input.ruleId}`,
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
      const recoveredEventsByGroup = new Map<string, AlertEvent>();
      for (const event of alertEventsBatch) {
        if (event.status === 'breached') {
          breachedGroupHashes.add(event.group_hash);
        } else if (event.status === 'recovered') {
          recoveredEventsByGroup.set(event.group_hash, event);
        }
      }

      const activeButAbsentGroups = activeGroups.filter(
        ({ group_hash }) => !breachedGroupHashes.has(group_hash)
      );

      if (activeButAbsentGroups.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No active-but-absent groups for rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const noDataQuery = getNoDataEsqlQuery(rule.query, rule.no_data_strategy);

      if (!noDataQuery) {
        step.logger.debug({
          message: `[${step.name}] No data-presence query available for rule ${input.ruleId}; skipping no-data handling`,
        });
        yield { type: 'continue', state };
        return;
      }

      const noDataQueryResult = await step.executeNoDataQuery({ rule, noDataQuery, input });

      const noDataGroupHashes: string[] = [];
      const dataPresentGroupHashes: string[] = [];
      for (const { group_hash } of activeButAbsentGroups) {
        if (noDataQueryResult.groupHashes.has(group_hash)) {
          dataPresentGroupHashes.push(group_hash);
        } else {
          noDataGroupHashes.push(group_hash);
        }
      }

      const groupsToReplace = new Set<string>();
      const eventsToAppend: AlertEvent[] = [];

      step.applyNoDataStrategy({
        rule,
        noDataGroupHashes,
        recoveredEventsByGroup,
        groupsToReplace,
        eventsToAppend,
        scheduledTimestamp: input.scheduledAt,
        spaceId: input.spaceId,
      });

      step.applyDataPresentStrategy({
        rule,
        input,
        dataPresentGroupHashes,
        rowsByGroupHash: noDataQueryResult.rowsByGroupHash,
        recoveredEventsByGroup,
        eventsToAppend,
      });

      let filteredBatch = alertEventsBatch;
      if (groupsToReplace.size !== 0) {
        filteredBatch = alertEventsBatch.filter(
          (event) => !(event.status === 'recovered' && groupsToReplace.has(event.group_hash))
        );
        step.logger.debug({
          message: `[${step.name}] Rewrote ${groupsToReplace.size} recovery events and appended ${eventsToAppend.length} events for rule ${input.ruleId}`,
        });
      }

      const nextBatch = [...filteredBatch, ...eventsToAppend];

      yield {
        type: 'continue',
        state: { ...state, alertEventsBatch: nextBatch },
      };
    });
  }

  private applyNoDataStrategy({
    rule,
    noDataGroupHashes,
    recoveredEventsByGroup,
    groupsToReplace,
    eventsToAppend,
    scheduledTimestamp,
    spaceId,
  }: {
    rule: RuleResponse;
    noDataGroupHashes: string[];
    recoveredEventsByGroup: Map<string, AlertEvent>;
    groupsToReplace: Set<string>;
    eventsToAppend: AlertEvent[];
    scheduledTimestamp: string;
    spaceId: string;
  }): void {
    if (noDataGroupHashes.length === 0) return;

    const strategy = rule.no_data_strategy;
    if (strategy === 'emit' || strategy === 'last_known_status') {
      for (const groupHash of noDataGroupHashes) {
        // replace previously reported recovered event groups with no_data events
        if (recoveredEventsByGroup.has(groupHash)) {
          groupsToReplace.add(groupHash);
        }
      }
      eventsToAppend.push(
        ...buildNoDataAlertEvents({
          ruleId: rule.id,
          ruleVersion: 1,
          spaceId,
          groupHashes: noDataGroupHashes,
          scheduledTimestamp,
        })
      );
    } else if (strategy === 'recover') {
      const groupsMissingRecovery = noDataGroupHashes.filter(
        (groupHash) => !recoveredEventsByGroup.has(groupHash)
      );

      if (groupsMissingRecovery.length === 0) return;

      eventsToAppend.push(
        ...buildRecoveryAlertEvents({
          ruleId: rule.id,
          ruleVersion: 1,
          spaceId,
          activeGroupHashes: groupsMissingRecovery.map((group_hash) => ({ group_hash })),
          breachedGroupHashes: new Set(),
          scheduledTimestamp,
        })
      );
    }
  }

  /**
   * When `recovery_strategy: 'query'`: a group with data
   * that didn't match either the breach or recovery query gets a re-asserted
   * `breached` event.
   */
  private applyDataPresentStrategy({
    rule,
    input,
    dataPresentGroupHashes,
    rowsByGroupHash,
    recoveredEventsByGroup,
    eventsToAppend,
  }: {
    rule: RuleResponse;
    input: RulePipelineState['input'];
    dataPresentGroupHashes: string[];
    rowsByGroupHash: Map<string, Record<string, unknown>>;
    recoveredEventsByGroup: Map<string, AlertEvent>;
    eventsToAppend: AlertEvent[];
  }): void {
    if (dataPresentGroupHashes.length === 0) return;

    if (rule.recovery_strategy !== 'query') return;

    const reassertRows: Array<Record<string, unknown>> = [];
    for (const groupHash of dataPresentGroupHashes) {
      if (recoveredEventsByGroup.has(groupHash)) continue;
      const row = rowsByGroupHash.get(groupHash);
      if (row) {
        reassertRows.push(row);
      }
    }

    if (reassertRows.length === 0) return;

    const buildBatch = createAlertEventsBatchBuilder({
      ruleId: rule.id,
      ruleVersion: 1,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      scheduledTimestamp: input.scheduledAt,
    });

    eventsToAppend.push(...buildBatch(reassertRows));
  }

  private async executeNoDataQuery({
    rule,
    noDataQuery,
    input,
  }: {
    rule: RuleResponse;
    noDataQuery: string;
    input: RulePipelineState['input'];
  }): Promise<NoDataQueryResult> {
    const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;

    const queryPayload = getQueryPayload({
      query: noDataQuery,
      timeField: rule.time_field,
      lookbackWindow,
    });

    this.logger.debug({
      message: () =>
        `[${this.name}] Executing no-data query for rule ${input.ruleId} - ${stableStringify({
          query: noDataQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
        })}`,
    });

    try {
      const esqlResponse = await this.scopedQueryService.executeQuery({
        query: noDataQuery,
        filter: queryPayload.filter,
        params: queryPayload.params,
        abortSignal: input.executionContext.signal,
      });

      return collectRowsFromNoDataQueryResponse({
        rule,
        esqlResponse,
      });
    } catch (error) {
      if (isEsqlUserError(error)) {
        throw createTaskRunError(error as Error, TaskErrorSource.USER);
      }
      throw error;
    }
  }
}

interface NoDataQueryResult {
  groupHashes: Set<string>;
  rowsByGroupHash: Map<string, Record<string, unknown>>;
}
function collectRowsFromNoDataQueryResponse({
  rule,
  esqlResponse,
}: {
  rule: RuleResponse;
  esqlResponse: EsqlQueryResponse;
}): NoDataQueryResult {
  const columns = esqlResponse.columns ?? [];
  const values = esqlResponse.values ?? [];

  if (columns.length === 0 || values.length === 0) {
    return { groupHashes: new Set(), rowsByGroupHash: new Map() };
  }

  const groupingFields = rule.grouping?.fields ?? [];
  const groupHashes = new Set<string>();
  const rowsByGroupHash = new Map<string, Record<string, unknown>>();

  for (let i = 0; i < values.length; i++) {
    const rowDoc = rowToDocument(columns, values[i]);

    const hash = buildGroupHash({
      rowDoc,
      groupKeyFields: groupingFields,
      fallbackSeed: `no_data|row:${i}`,
    });

    groupHashes.add(hash);
    if (!rowsByGroupHash.has(hash)) {
      rowsByGroupHash.set(hash, rowDoc);
    }
  }

  return { groupHashes, rowsByGroupHash };
}
