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
import { RulesClient } from '../../rules_client';

@injectable()
export class FetchRuleStep implements RuleExecutionStep {
  public readonly name = 'fetch_rule';

  constructor(@inject(RulesClient) private readonly rulesClient: RulesClient) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return mapStep(streamState, async (state) => {
      const { input } = state;
      const { ruleId } = input;
      const logger = state.logger.withLabels({ step: this.name });

      logger.debug({ message: 'Starting fetch rule step' });

      try {
        const rule = await this.rulesClient.getRule({ id: ruleId });

        logger.debug({ message: 'Fetched rule' });

        return {
          type: 'continue',
          state: {
            ...state,
            rule,
            logger: state.logger.withLabels({ rule_kind: rule.kind }),
          },
        };
      } catch (error) {
        if (Boom.isBoom(error) && error.output.statusCode === 404) {
          logger.debug({ message: 'Rule not found, halting' });
          return { type: 'halt', reason: 'rule_deleted', state };
        }

        logger.debug({ message: 'Failed to fetch rule' });
        throw error;
      }
    });
  }
}
