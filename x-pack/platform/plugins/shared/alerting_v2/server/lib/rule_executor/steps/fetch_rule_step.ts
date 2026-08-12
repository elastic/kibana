/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import Boom from '@hapi/boom';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapStep } from '../stream_utils';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { RulesClient } from '../../rules_client';

@injectable()
export class FetchRuleStep implements RuleExecutionStep {
  public readonly name = 'fetch_rule';

  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract,
    @inject(RulesClient) private readonly rulesClient: RulesClient
  ) {
    this.logger = loggerService.forSubsystem('ruleExecutor');
  }

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return mapStep(streamState, async (state) => {
      const { input } = state;
      const { ruleId } = input;

      this.logger.debug({
        message: 'Starting fetch rule step',
        labels: { step: this.name, rule_id: ruleId },
      });

      try {
        const rule = await this.rulesClient.getRule({ id: ruleId });

        this.logger.debug({
          message: () => 'Fetched rule',
          labels: { step: this.name, rule_id: ruleId },
        });

        return { type: 'continue', state: { ...state, rule } };
      } catch (error) {
        if (Boom.isBoom(error) && error.output.statusCode === 404) {
          this.logger.debug({
            message: 'Rule not found, halting',
            labels: { step: this.name, rule_id: ruleId },
          });
          return { type: 'halt', reason: 'rule_deleted', state };
        }

        this.logger.debug({
          message: 'Failed to fetch rule',
          labels: { step: this.name, rule_id: ruleId },
        });
        throw error;
      }
    });
  }
}
