/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { inject, injectable } from 'inversify';
import { v4 as uuidV4 } from 'uuid';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import type { DispatcherExecutionParams, DispatcherExecutionResult } from './types';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(DispatcherPipeline) private readonly pipeline: DispatcherPipelineContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async run({
    eventWatermark,
    signal = new AbortController().signal,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    if (!eventWatermark) {
      this.logger.warn({
        code: ALERTING_LOG_CODES.DISPATCHER_COLD_START,
        message: () =>
          `Dispatcher: no persisted watermark; starting from ${LOOKBACK_WINDOW_MINUTES}m ago. ` +
          `Rule events older than that will not be dispatched.`,
      });
    }

    const resolvedWatermark =
      eventWatermark ?? moment(startedAt).subtract(LOOKBACK_WINDOW_MINUTES, 'minutes').toDate();

    const executionUuid = uuidV4();

    const pipelineResult = await this.pipeline.execute({
      startedAt,
      eventWatermark: resolvedWatermark,
      executionUuid,
      signal,
    });

    // Phase 2: nextWatermark still follows the old policy (startedAt) so scan
    // behavior is byte-identical to main. Phase 3 derives it from the tick outcome.
    return { startedAt, nextWatermark: startedAt, pipelineResult };
  }
}
