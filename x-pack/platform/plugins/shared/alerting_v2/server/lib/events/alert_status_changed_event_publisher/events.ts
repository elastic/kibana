/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertStatusChangedTriggerPayload } from '../../../../common/workflows/triggers';

/** Discriminator value for {@link AlertStatusChangedEvent}. */
export const ALERT_STATUS_CHANGED_EVENT_TYPE = 'alert.status.changed' as const;

/**
 * Domain event published on the alerting bus once per genuine alert status
 * change, after the change is persisted. Published by the rule executor for
 * rule-produced alerts and by the alert events client for alerts written
 * through it.
 *
 * The payload is the `alerting.alertStatusChanged` trigger payload, so the
 * workflow subscriber forwards it unchanged.
 */
export interface AlertStatusChangedEvent {
  readonly type: typeof ALERT_STATUS_CHANGED_EVENT_TYPE;
  readonly payload: AlertStatusChangedTriggerPayload;
}
