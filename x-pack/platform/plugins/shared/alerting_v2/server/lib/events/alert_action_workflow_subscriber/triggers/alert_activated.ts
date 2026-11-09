/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertActivatedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_ACTIVATED_TRIGGER_ID,
  alertActivatedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_ACTIVATED_EVENT_TYPE,
  type EpisodeActivatedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_ACTIVATED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.activated` event to the
 * `alerting.actions.alertActivated` workflow trigger.
 */
export const alertActivatedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeActivatedEvent,
  typeof alertActivatedPayloadSchema
> = {
  eventType: EPISODE_ACTIVATED_EVENT_TYPE,
  triggerId: ALERT_ACTIVATED_TRIGGER_ID,
  definition: alertActivatedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), reason: event.payload.reason }),
};
