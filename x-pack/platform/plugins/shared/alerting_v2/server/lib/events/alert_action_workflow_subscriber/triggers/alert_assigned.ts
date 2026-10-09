/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertAssignedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_ASSIGNED_TRIGGER_ID,
  alertAssignedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type EpisodeAssignedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_ASSIGNED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.assigned` event to the
 * `alerting.actions.alertAssigned` workflow trigger.
 *
 * Adding a new field to either side requires updating
 * {@link alertAssignedPayloadSchema} and {@link alertAssignedTrigger.toPayload}
 * together so the registered schema and the runtime payload stay in lockstep.
 */
export const alertAssignedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeAssignedEvent,
  typeof alertAssignedPayloadSchema
> = {
  eventType: EPISODE_ASSIGNED_EVENT_TYPE,
  triggerId: ALERT_ASSIGNED_TRIGGER_ID,
  definition: alertAssignedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), assigneeUid: event.payload.assigneeUid }),
};
