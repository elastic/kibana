/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/datastreams/alert_events';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { guardedMapStep } from '../stream_utils';

@injectable()
export class StoreAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'store_alert_events';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['alertEventsBatch'], async (state) => {
      this.logger.debug({
        message: `[${this.name}] Storing alert events batch to ${ALERT_EVENTS_DATA_STREAM}`,
      });

      await this.storageService.bulkIndexDocs({
        index: ALERT_EVENTS_DATA_STREAM,
        docs: state.alertEventsBatch,
      });

      this.logger.debug({
        message: `[${this.name}] Successfully stored alert events batch`,
      });

      return { type: 'continue', state };
    });
  }
}
