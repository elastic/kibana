/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeUnassignedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNASSIGNED_TRIGGER_ID,
  episodeUnassignedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNASSIGNED_EVENT_TYPE,
  type EpisodeUnassignedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_UNASSIGNED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unassigned` event to the
 * `alerting.episodeUnassigned` workflow trigger.
 */
export const episodeUnassignedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnassignedEvent,
  typeof episodeUnassignedPayloadSchema
> = {
  eventType: EPISODE_UNASSIGNED_EVENT_TYPE,
  triggerId: EPISODE_UNASSIGNED_TRIGGER_ID,
  definition: episodeUnassignedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
