/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { buildRecoveryAlertEvents } from '../build_alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { getActiveAlertGroupHashesQuery, type ActiveAlertGroupHash } from '../../director/queries';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import { hasState, type StateWith } from '../type_guards';

@injectable()
export class CreateRecoveryEventsStep implements RuleExecutionStep {
  public readonly name = 'create_recovery_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
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

    const breachedGroupHashes = new Set(alertEvents.map((event) => event.group_hash));

    const recoveryEvents = buildRecoveryAlertEvents({
      ruleId: input.ruleId,
      ruleVersion: 1,
      activeGroupHashes,
      breachedGroupHashes,
      scheduledTimestamp: input.scheduledAt,
    });

    this.logger.debug({
      message: `[${this.name}] Created ${recoveryEvents.length} recovery events for rule ${input.ruleId}`,
    });

    return {
      type: 'continue',
      data: { alertEvents: [...alertEvents, ...recoveryEvents] },
    };
  }

  private async fetchActiveAlertGroupHashes(ruleId: string): Promise<ActiveAlertGroupHash[]> {
    const request = getActiveAlertGroupHashesQuery({ ruleId }).toRequest();
    const response = await this.queryService.executeQuery({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
    });

    return queryResponseToRecords<ActiveAlertGroupHash>(response);
  }
}
