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
import { guardedExpandStep } from '../stream_utils';

@injectable()
export class CreateAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'create_alert_events';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    const step = this;
    let buildBatch: AlertEventsBatchBuilder | undefined;

    return guardedExpandStep(streamState, ['rule', 'esqlRowBatch'], async function* (state) {
      if (!buildBatch) {
        buildBatch = createAlertEventsBatchBuilder({
          ruleId: state.input.ruleId,
          spaceId: state.input.spaceId,
          ruleAttributes: state.rule,
          scheduledTimestamp: state.input.scheduledAt,
          ruleVersion: 1,
        });

        step.logger.debug({
          message: `[${step.name}] Created alert events builder for rule ${state.input.ruleId}`,
        });
      }

      const alertEventsBatch = buildBatch([...state.esqlRowBatch]);

      yield { type: 'continue', state: { ...state, alertEventsBatch } };
    });
  }
}
