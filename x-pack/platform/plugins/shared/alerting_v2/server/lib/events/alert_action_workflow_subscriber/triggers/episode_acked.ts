/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeAckedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_ACKED_TRIGGER_ID,
  episodeAckedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_ACKED_EVENT_TYPE,
  type EpisodeAckedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_ACKED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.acked` event to the
 * `alerting.episodeAcked` workflow trigger.
 */
export const episodeAckedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeAckedEvent,
  typeof episodeAckedPayloadSchema
> = {
  eventType: EPISODE_ACKED_EVENT_TYPE,
  triggerId: EPISODE_ACKED_TRIGGER_ID,
  definition: episodeAckedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
