/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertEventStatus, type AlertEvent } from '../../../resources/datastreams/alert_events';
import { emitEvent } from '../events';
import type { AlertEventStatusKind, AlertEventStoredEvent } from '../events';
import type { TelemetryInput } from './with_query_telemetry';

const STATUS_TO_KIND: Record<string, AlertEventStatusKind> = {
  [alertEventStatus.breached]: 'breached',
  [alertEventStatus.recovered]: 'recovered',
  [alertEventStatus.no_data]: 'no_data',
};

/**
 * Wraps a bulk-index call for alert events so that one
 * `alert_event_stored` event fires per persisted document, with the
 * matching status discriminator.
 *
 * Per-item bulk errors are intentionally not subtracted here — the
 * service surfaces them via its own logging and the PoC takes the
 * happy-path approximation. M3 may want a richer per-item result.
 *
 * Use this helper instead of calling `StorageService.bulkIndexDocs`
 * directly when persisting alert events, so the telemetry contract is
 * satisfied by composition rather than by every step author remembering
 * to emit.
 *
 * @example
 *   await withAlertEventStorageTelemetry(state.input, alertEventsBatch, () =>
 *     this.storageService.bulkIndexDocs({ index, docs: alertEventsBatch })
 *   );
 */
export const withAlertEventStorageTelemetry = async (
  input: TelemetryInput,
  docs: ReadonlyArray<AlertEvent>,
  call: () => Promise<void>
): Promise<void> => {
  await call();

  for (const doc of docs) {
    const status = STATUS_TO_KIND[doc.status];
    if (status != null) {
      emitEvent<AlertEventStoredEvent>(input.executionContext, input.executionUuid, {
        kind: 'alert_event_stored',
        status,
      });
    }
  }
};
