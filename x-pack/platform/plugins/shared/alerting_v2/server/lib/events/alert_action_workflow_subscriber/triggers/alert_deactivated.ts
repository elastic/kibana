/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertDeactivatedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_DEACTIVATED_TRIGGER_ID,
  alertDeactivatedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_DEACTIVATED_EVENT_TYPE,
  type EpisodeDeactivatedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_DEACTIVATED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.deactivated` event to the
 * `alerting.userActions.alertDeactivated` workflow trigger.
 */
export const alertDeactivatedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeDeactivatedEvent,
  typeof alertDeactivatedPayloadSchema
> = {
  eventType: EPISODE_DEACTIVATED_EVENT_TYPE,
  triggerId: ALERT_DEACTIVATED_TRIGGER_ID,
  definition: alertDeactivatedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), reason: event.payload.reason }),
};
