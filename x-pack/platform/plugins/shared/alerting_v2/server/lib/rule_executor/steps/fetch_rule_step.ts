/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import Boom from '@hapi/boom';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { RulesClient } from '../../rules_client';

@injectable()
export class FetchRuleStep implements RuleExecutionStep {
  public readonly name = 'fetch_rule';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { ruleId } = state.input;

    try {
      const rule = await this.rulesClient.getRule({ id: ruleId });

      this.logger.debug({
        message: () => `Rule saved object attributes: ${JSON.stringify(rule, null, 2)}`,
      });

      return { type: 'continue', data: { rule } };
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 404) {
        return { type: 'halt', reason: 'rule_deleted' };
      }

      throw error;
    }
  }
}
