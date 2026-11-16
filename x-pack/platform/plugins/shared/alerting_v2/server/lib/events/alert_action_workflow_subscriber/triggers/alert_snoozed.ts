/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertSnoozedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_SNOOZED_TRIGGER_ID,
  alertSnoozedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_SNOOZED_EVENT_TYPE,
  type EpisodeSnoozedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_SNOOZED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.snoozed` event to the
 * `alerting.actions.alertSnoozed` workflow trigger.
 */
export const alertSnoozedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeSnoozedEvent,
  typeof alertSnoozedPayloadSchema
> = {
  eventType: EPISODE_SNOOZED_EVENT_TYPE,
  triggerId: ALERT_SNOOZED_TRIGGER_ID,
  definition: alertSnoozedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), expiry: event.payload.expiry }),
};
