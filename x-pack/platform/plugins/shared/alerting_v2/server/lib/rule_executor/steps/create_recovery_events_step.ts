/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { stableStringify } from '@kbn/std';
import { recoveryPolicyType } from '@kbn/alerting-v2-schemas';
import type { PipelineStateStream, RuleExecutionStep, RulePipelineState } from '../types';
import { buildRecoveryAlertEvents, buildQueryRecoveryAlertEvents } from '../build_alert_events';
import { getQueryPayload } from '../get_query_payload';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import {
  QueryServiceInternalToken,
  QueryServiceScopedToken,
} from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { getActiveAlertGroupHashesQuery, type ActiveAlertGroupHash } from '../queries';
import { guardedExpandStep } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';
import type { AlertEvent } from '../../../resources/alert_events';
import type { ExecutionContext } from '../../execution_context';

@injectable()
export class CreateRecoveryEventsStep implements RuleExecutionStep {
  public readonly name = 'create_recovery_events';

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
          message: `[${step.name}] Skipping recovery for non-alert rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const activeGroupHashes = await step.fetchActiveAlertGroupHashes(
        rule.id,
        input.executionContext
      );

      if (activeGroupHashes.length === 0) {
        step.logger.debug({
          message: `[${step.name}] No active alerts to recover for rule ${input.ruleId}`,
        });
        yield { type: 'continue', state };
        return;
      }

      const recoveryType = rule.recovery_policy?.type ?? recoveryPolicyType.no_breach;

      const recoveryEvents =
        recoveryType === recoveryPolicyType.query
          ? await step.buildQueryRecovery({ rule, input, activeGroupHashes })
          : buildRecoveryAlertEvents({
              ruleId: rule.id,
              ruleVersion: 1,
              activeGroupHashes,
              breachedGroupHashes: new Set(alertEventsBatch.map((e) => e.group_hash)),
              scheduledTimestamp: input.scheduledAt,
            });

      step.logger.debug({
        message: `[${step.name}] Created ${recoveryEvents.length} recovery events (${recoveryType}) for rule ${input.ruleId}`,
      });

      yield {
        type: 'continue',
        state: {
          ...state,
          alertEventsBatch: [...alertEventsBatch, ...recoveryEvents],
        },
      };
    });
  }

  private async buildQueryRecovery({
    rule,
    input,
    activeGroupHashes,
  }: {
    rule: RuleResponse;
    input: RulePipelineState['input'];
    activeGroupHashes: ActiveAlertGroupHash[];
  }): Promise<AlertEvent[]> {
    const effectiveQuery = rule.recovery_policy!.query!.base!.trimEnd();
    const lookbackWindow = rule.schedule.lookback ?? rule.schedule.every;

    const queryPayload = getQueryPayload({
      query: effectiveQuery,
      timeField: rule.time_field,
      lookbackWindow,
    });

    this.logger.debug({
      message: () =>
        `[${this.name}] Executing recovery query for rule ${input.ruleId} - ${stableStringify({
          query: effectiveQuery,
          filter: queryPayload.filter,
          params: queryPayload.params,
        })}`,
    });

    const esqlResponse = await this.scopedQueryService.executeQuery({
      query: effectiveQuery,
      filter: queryPayload.filter,
      params: queryPayload.params,
      abortSignal: input.executionContext.signal,
    });

    return buildQueryRecoveryAlertEvents({
      ruleId: rule.id,
      ruleVersion: 1,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      activeGroupHashes,
      esqlResponse,
      scheduledTimestamp: input.scheduledAt,
    });
  }

  private async fetchActiveAlertGroupHashes(
    ruleId: string,
    executionContext: ExecutionContext
  ): Promise<ActiveAlertGroupHash[]> {
    const request = getActiveAlertGroupHashesQuery({ ruleId }).toRequest();
    return this.internalQueryService.executeQueryRows<ActiveAlertGroupHash>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
      abortSignal: executionContext.signal,
    });
  }
}
