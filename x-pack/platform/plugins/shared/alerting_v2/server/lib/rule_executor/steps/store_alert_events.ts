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
import type { ExecutionContext } from '../../execution_context';
import { guardedMapStep } from '../stream_utils';
import { emitEvent } from '../events';
import type { AlertEventStatusKind, AlertEventStoredEvent } from '../events';

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

      // Step emits one `alert_event_stored` per persisted document. The
      // StorageService stays a generic bulk indexer — it does not know
      // about alert-event `status` semantics. Per-item bulk errors are
      // surfaced via service logs and intentionally not subtracted here
      // for the PoC.
      emitStoredEvents(
        state.alertEventsBatch,
        state.input.executionContext,
        state.input.executionUuid
      );

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

const emitStoredEvents = (
  events: ReadonlyArray<AlertEvent>,
  executionContext: ExecutionContext,
  executionUuid: string
): void => {
  for (const event of events) {
    const status = STATUS_TO_KIND[event.status];
    if (status != null) {
      emitEvent<AlertEventStoredEvent>(executionContext, executionUuid, {
        kind: 'alert_event_stored',
        status,
      });
    }
  }
};
