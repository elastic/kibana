/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { DirectorService } from '../../director/director';
import type { StateWith } from '../type_guards';
import { hasState } from '../type_guards';

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(DirectorService) private readonly director: DirectorService
  ) {}

  private isStepReady(state: Readonly<RulePipelineState>): state is StateWith<'rule'> {
    return hasState(state, ['rule']);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input, alertEvents = [] } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId} with ${alertEvents.length} alert events`,
    });

    if (!this.isStepReady(state)) {
      this.logger.debug({ message: `[${this.name}] State not ready, halting` });
      return { type: 'halt', reason: 'state_not_ready' };
    }

    const { rule } = state;

    /**
     * Only alertable rules can generate episodes.
     */

    if (rule.kind !== 'alert') {
      this.logger.debug({
        message: `[${this.name}] Skipping episode tracking for signal rule ${input.ruleId}`,
      });

      return { type: 'continue', data: { alertEvents } };
    }

    try {
      const alertsWithNextEpisode = await this.director.run({ rule, alertEvents });

      this.logger.debug({
        message: `[${this.name}] Director completed for rule ${input.ruleId}`,
      });

      return { type: 'continue', data: { alertEvents: alertsWithNextEpisode } };
    } catch (error) {
      this.logger.debug({
        message: `[${this.name}] Director failed for rule ${input.ruleId}`,
      });
      throw error;
    }
  }
}
