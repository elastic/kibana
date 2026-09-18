/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import { guardedMapStep } from '../stream_utils';

@injectable()
export class StoreAlertEventsStep implements RuleExecutionStep {
  public readonly name = 'store_alert_events';

  constructor(
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public executeStream(streamState: PipelineStateStream): PipelineStateStream {
    return guardedMapStep(streamState, ['alertEventsBatch'], async (state) => {
      const logger = state.logger.withLabels({
        step: this.name,
        resource: ALERT_EVENTS_DATA_STREAM,
      });

      logger.debug({ message: 'Storing alert events batch' });

      const bulkResult = await this.storageService.bulkIndexDocs({
        index: ALERT_EVENTS_DATA_STREAM,
        docs: state.alertEventsBatch,
      });

      logger.debug({ message: 'Bulk-indexed alert events batch' });

      return {
        type: 'continue',
        state,
        meta: {
          observations: {
            bulkIndexResult: bulkResult,
          },
        },
      };
    });
  }
}
