/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeUnackedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNACKED_TRIGGER_ID,
  episodeUnackedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNACKED_EVENT_TYPE,
  type EpisodeUnackedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_UNACKED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unacked` event to the
 * `alerting.episodeUnacked` workflow trigger.
 */
export const episodeUnackedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnackedEvent,
  typeof episodeUnackedPayloadSchema
> = {
  eventType: EPISODE_UNACKED_EVENT_TYPE,
  triggerId: EPISODE_UNACKED_TRIGGER_ID,
  definition: episodeUnackedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
