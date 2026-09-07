/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeTaggedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_TAGGED_TRIGGER_ID,
  episodeTaggedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_TAGGED_EVENT_TYPE,
  type EpisodeTaggedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_TAGGED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.tagged` event to the
 * `alerting.episodeTagged` workflow trigger.
 */
export const episodeTaggedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeTaggedEvent,
  typeof episodeTaggedPayloadSchema
> = {
  eventType: EPISODE_TAGGED_EVENT_TYPE,
  triggerId: EPISODE_TAGGED_TRIGGER_ID,
  definition: episodeTaggedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), tags: [...event.payload.tags] }),
};
