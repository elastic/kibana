/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { createAlertEventsBatchBuilder, type AlertEventsBatchBuilder } from '../build_alert_events';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { flatMapStep, requireState } from '../stream_utils';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;
    let buildBatch: AlertEventsBatchBuilder | undefined;

    return flatMapStep(streamState, async function* (state) {
      const { input } = state;

      step.logger.debug({
        message: `[${step.name}] Starting step for rule ${input.ruleId}`,
      });

      const requiredState = requireState(state, ['rule', 'esqlRowBatch']);

      if (!requiredState.ok) {
        step.logger.debug({ message: `[${step.name}] State not ready, halting` });
        yield requiredState.result;
        return;
      }

      if (!buildBatch) {
        buildBatch = createAlertEventsBatchBuilder({
          ruleId: input.ruleId,
          spaceId: input.spaceId,
          ruleAttributes: requiredState.state.rule,
          scheduledTimestamp: input.scheduledAt,
          ruleVersion: 1,
        });

        step.logger.debug({
          message: `[${step.name}] Created alert events builder for rule ${input.ruleId}`,
        });
      }

      const alertEventsBatch = buildBatch([...requiredState.state.esqlRowBatch]);

      if (alertEventsBatch.length > 0) {
        yield { type: 'continue', state: { ...requiredState.state, alertEventsBatch } };
      }
    });
  }
}
