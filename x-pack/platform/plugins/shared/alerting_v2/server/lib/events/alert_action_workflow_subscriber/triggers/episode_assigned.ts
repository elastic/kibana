/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeAssignedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_ASSIGNED_TRIGGER_ID,
  episodeAssignedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_ASSIGNED_EVENT_TYPE,
  type EpisodeAssignedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_ASSIGNED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.assigned` event to the
 * `alerting.episodeAssigned` workflow trigger.
 *
 * Adding a new field to either side requires updating
 * {@link episodeAssignedPayloadSchema} and {@link episodeAssignedTrigger.toPayload}
 * together so the registered schema and the runtime payload stay in lockstep.
 */
export const episodeAssignedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeAssignedEvent,
  typeof episodeAssignedPayloadSchema
> = {
  eventType: EPISODE_ASSIGNED_EVENT_TYPE,
  triggerId: EPISODE_ASSIGNED_TRIGGER_ID,
  definition: episodeAssignedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), assigneeUid: event.payload.assigneeUid }),
};
