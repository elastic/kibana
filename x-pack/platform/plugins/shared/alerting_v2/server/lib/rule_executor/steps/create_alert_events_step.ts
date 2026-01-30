/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { buildAlertEventsFromEsqlResponse } from '../build_alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { hasState, type StateWith } from '../type_guards';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  private isStepReady(
    state: Readonly<RulePipelineState>
  ): state is StateWith<'rule' | 'esqlResponse'> {
    return hasState(state, ['rule', 'esqlResponse']);
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

    const { rule, esqlResponse } = state;

    const alertEvents = buildAlertEventsFromEsqlResponse({
      ruleId: input.ruleId,
      spaceId: input.spaceId,
      ruleAttributes: rule,
      esqlResponse,
      scheduledTimestamp: input.scheduledAt,
      ruleVersion: 1,
    });

    this.logger.debug({
      message: `[${this.name}] Created ${alertEvents.length} alert events for rule ${input.ruleId}`,
    });

    return { type: 'continue', data: { alertEvents } };
  }
}
