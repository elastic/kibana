/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { stableStringify } from '@kbn/std';
import { getNoDataEsqlQuery } from '@kbn/alerting-v2-schemas';
import { isEsqlUserError } from '../../errors/esql_user_error';
import type { PipelineStateStream, RuleExecutionInput, RuleExecutionStep } from '../types';
import { buildExecutionUuid, buildGroupHash } from '../build_alert_events';
import { getQueryPayload } from '../get_query_payload';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { QueryServiceScopedSpaceRoutingToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { guardedExpandStep } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';

/**
 * Runs the rule's no_data ES|QL query and records the set of
 * group hashes that still have data as `dataPresentGroupHashes` on the pipeline
 * state.
 *
 * This step runs before {@link CreateRecoveryEventsStep} and
 * {@link CreateNoDataEventsStep} so both can consult data presence.
 *
 * The no_data query is only available when `no_data_strategy` is not
 * `'none'`. When it is `'none'` this step is a no-op; downstream steps then fall back to their
 * data-presence-agnostic behavior.
 */
@injectable()
export class DetectDataPresenceStep implements RuleExecutionStep {
  public readonly name = 'detect_data_presence';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceScopedSpaceRoutingToken)
    private readonly scopedQueryService: QueryServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;

    return guardedExpandStep(streamState, ['rule', 'alertEventsBatch'], async function* (state) {
      const { input, rule } = state;

      if (rule.kind !== 'alert') {
        step.logger.debug({
          message: `[${step.name}] Skipping data-presence detection for non-alert rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const noDataQuery = getNoDataEsqlQuery(rule.query, rule.no_data_strategy);

      if (!noDataQuery) {
        step.logger.debug({
          message: `[${step.name}] No data-presence query available for rule ${input.ruleId}; skipping detection`,
        });
        yield { type: 'continue', state };
        return;
      }

      const dataPresentGroupHashes = await step.executeNoDataQuery({ rule, noDataQuery, input });

      step.logger.debug({
        message: `[${step.name}] Detected ${dataPresentGroupHashes.size} data-present group(s) for rule ${input.ruleId}`,
      });

      yield {
        type: 'continue',
        state: { ...state, dataPresentGroupHashes },
      };
    });
  }

  private async executeNoDataQuery({
    rule,
    noDataQuery,
    input,
  }: {
    rule: RuleResponse;
    noDataQuery: string;
    input: RuleExecutionInput;
  }): Promise<Set<string>> {
    const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;

    const queryPayload = getQueryPayload({
      query: noDataQuery,
      timeField: rule.time_field,
      lookbackWindow,
    });

    this.logger.debug({
      message: () =>
        `[${this.name}] Executing data-presence query for rule ${input.ruleId} - ${stableStringify({
          query: noDataQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
        })}`,
    });

    try {
      const rows = await this.scopedQueryService.executeQueryRows({
        query: noDataQuery,
        filter: queryPayload.filter,
        params: queryPayload.params,
        abortSignal: input.executionContext.signal,
      });

      return collectGroupHashesFromRows({
        rule,
        rows,
        input,
      });
    } catch (error) {
      if (isEsqlUserError(error)) {
        throw createTaskRunError(error as Error, TaskErrorSource.USER);
      }
      throw error;
    }
  }
}

function collectGroupHashesFromRows({
  rule,
  rows,
  input,
}: {
  rule: RuleResponse;
  rows: Array<Record<string, unknown>>;
  input: RuleExecutionInput;
}): Set<string> {
  const { ruleId, spaceId, scheduledAt } = input;

  if (rows.length === 0) {
    return new Set();
  }

  const groupingFields = rule.grouping?.fields ?? [];
  const executionUuid = buildExecutionUuid({
    ruleId,
    spaceId,
    scheduledTimestamp: scheduledAt,
    suffix: 'no_data',
  });
  const groupHashes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const rowDoc = rows[i];

    const hash = buildGroupHash({
      rowDoc,
      groupKeyFields: groupingFields,
      get fallbackSeed(): string {
        return `${executionUuid}|row:${i}|${stableStringify(rowDoc)}`;
      },
    });

    groupHashes.add(hash);
  }

  return groupHashes;
}
