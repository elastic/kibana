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

@injectable()
export class DirectorStep implements RuleExecutionStep {
  public readonly name = 'director_step';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(DirectorService) private readonly director: DirectorService
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input, alertEvents = [] } = state;

    this.logger.debug({
      message: `[${this.name}] Starting step for rule ${input.ruleId} with ${alertEvents.length} alert events`,
    });

    try {
      const enrichedAlertEvents = await this.director.run({ ruleId: input.ruleId, alertEvents });

      this.logger.debug({
        message: `[${this.name}] Director completed for rule ${input.ruleId}`,
      });

      return { type: 'continue', data: { alertEvents: enrichedAlertEvents } };
    } catch (error) {
      this.logger.debug({
        message: `[${this.name}] Director failed for rule ${input.ruleId}`,
      });
      throw error;
    }
  }
}
