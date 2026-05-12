/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEventStatus,
  type AlertEvent,
} from '../../../resources/datastreams/alert_events';
import { StorageServiceInternalToken } from '../../services/storage_service/tokens';
import type { StorageServiceContract } from '../../services/storage_service/storage_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { AlertEventStatusKind, StorageMetricsRecorder } from '../../execution_context';
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

      // Telemetry is owned by the step. StorageService is a generic bulk
      // indexer and must not know about alert-event `status` semantics. We
      // tally the batch we just successfully wrote (the bulk call returned
      // without throwing); per-item bulk errors are surfaced via service
      // logs and intentionally not subtracted here for the PoC.
      recordWrittenEvents(state.alertEventsBatch, state.input.executionContext.metrics.storage);

      this.logger.debug({
        message: `[${this.name}] Successfully stored alert events batch`,
      });

      return { type: 'continue', state };
    });
  }
}

const STATUS_TO_KIND: Record<string, AlertEventStatusKind> = {
  [alertEventStatus.breached]: 'breached',
  [alertEventStatus.recovered]: 'recovered',
  [alertEventStatus.no_data]: 'no_data',
};

const recordWrittenEvents = (
  events: ReadonlyArray<AlertEvent>,
  metrics: StorageMetricsRecorder
): void => {
  for (const event of events) {
    const kind = STATUS_TO_KIND[event.status];
    if (kind != null) {
      metrics.recordEventWritten(kind);
    }
  }
};
