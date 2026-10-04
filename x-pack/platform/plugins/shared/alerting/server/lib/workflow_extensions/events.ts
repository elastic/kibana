/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AlertStatusChangedV1Payload } from '../../../common/workflows/triggers';

/**
 * Per-run batch event carrying all alert status transitions from a single rule
 * execution. Replaces individual per-alert events so the workflows subscriber
 * can call `emitBatch` once per run.
 */
export const ALERT_STATUS_CHANGED_BATCH_EVENT_TYPE = 'alert.status.changed.batch' as const;

export interface AlertStatusChangedBatchEvent {
  readonly type: typeof ALERT_STATUS_CHANGED_BATCH_EVENT_TYPE;
  /** All active/recovered alert transitions produced by a single rule run. */
  readonly alerts: AlertStatusChangedV1Payload[];
}

/** Publisher context threaded from the rule task to the workflow subscriber. */
export interface AlertingPublisherContext {
  readonly request: KibanaRequest;
}

/** Discriminated union of events published on the v1 alerting domain bus. */
export type AlertingDomainEvent = AlertStatusChangedBatchEvent;
