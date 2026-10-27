/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AlertStatusChangedV1Payload } from '../../../common/workflows/triggers';

export const ALERT_STATUS_CHANGED_EVENT_TYPE = 'alert.status.changed' as const;

export interface AlertStatusChangedEvent {
  readonly type: typeof ALERT_STATUS_CHANGED_EVENT_TYPE;
  readonly payload: AlertStatusChangedV1Payload;
}

/** Publisher context threaded from the rule task to the workflow subscriber. */
export interface AlertingPublisherContext {
  readonly request: KibanaRequest;
}

/** Discriminated union of events published on the v1 alerting domain bus. */
export type AlertingDomainEvent = AlertStatusChangedEvent;
