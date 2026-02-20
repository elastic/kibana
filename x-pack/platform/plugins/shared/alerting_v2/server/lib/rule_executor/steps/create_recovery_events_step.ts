/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { stableStringify } from '@kbn/std';
import { recoveryPolicyType } from '@kbn/alerting-v2-schemas';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
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
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import { hasState, type StateWith } from '../type_guards';
import type { RuleResponse } from '../../rules_client';
import type { AlertEvent } from '../../../resources/alert_events';

@injectable()
export class CreateRecoveryEventsStep implements RuleExecutionStep {
  public readonly name = 'create_recovery_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly internalQueryService: QueryServiceContract,
    @inject(QueryServiceScopedToken) private readonly scopedQueryService: QueryServiceContract
  ) {}

  private isStepReady(
    state: Readonly<RulePipelineState>
  ): state is StateWith<'rule' | 'alertEvents'> {
    return hasState(state, ['rule', 'alertEvents']);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId}`,
    });

    if (!this.isStepReady(state)) {
      this.logger.debug({ message: `[${this.name}] State not ready, halting` });
      return { type: 'halt', reason: 'state_not_ready' };
    }

    const { rule, alertEvents } = state;

    if (rule.kind !== 'alert') {
      this.logger.debug({
        message: `[${this.name}] Skipping recovery for non-alert rule ${input.ruleId}`,
      });
      return { type: 'continue', data: { alertEvents } };
    }

    const activeGroupHashes = await this.fetchActiveAlertGroupHashes(input.ruleId);

    if (activeGroupHashes.length === 0) {
      this.logger.debug({
        message: `[${this.name}] No active alerts to recover for rule ${input.ruleId}`,
      });
      return { type: 'continue', data: { alertEvents } };
    }

    const recoveryType = rule.recovery_policy?.type ?? recoveryPolicyType.no_breach;

    const recoveryEvents =
      recoveryType === recoveryPolicyType.query
        ? await this.buildQueryRecovery({ rule, input, activeGroupHashes })
        : this.buildNoBreachRecovery({ rule, input, alertEvents, activeGroupHashes });

    this.logger.debug({
      message: `[${this.name}] Created ${recoveryEvents.length} recovery events (${recoveryType}) for rule ${input.ruleId}`,
    });

    return {
      type: 'continue',
      data: { alertEvents: [...alertEvents, ...recoveryEvents] },
    };
  }

  private buildNoBreachRecovery({
    rule,
    input,
    alertEvents,
    activeGroupHashes,
  }: {
    rule: RuleResponse;
    input: RulePipelineState['input'];
    alertEvents: AlertEvent[];
    activeGroupHashes: ActiveAlertGroupHash[];
  }): AlertEvent[] {
    const breachedGroupHashes = new Set(alertEvents.map((event) => event.group_hash));

    return buildRecoveryAlertEvents({
      ruleId: rule.id,
      ruleVersion: 1,
      activeGroupHashes,
      breachedGroupHashes,
      scheduledTimestamp: input.scheduledAt,
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
      abortSignal: input.abortSignal,
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

  private async fetchActiveAlertGroupHashes(ruleId: string): Promise<ActiveAlertGroupHash[]> {
    const request = getActiveAlertGroupHashesQuery({ ruleId }).toRequest();
    const response = await this.internalQueryService.executeQuery({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
    });

    return queryResponseToRecords<ActiveAlertGroupHash>(response);
  }
}
