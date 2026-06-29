/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeActionEnvelopePayload } from '../../../../../common/workflows/triggers';
import type { AlertActionEventEnvelope } from '../../alert_action_event_publisher/events';

/**
 * Maps the shared bus envelope onto the workflow payload envelope.
 *
 * Every alert-action trigger payload starts from these six fields; per-type
 * bindings spread the result and append their action-specific fields, so the
 * envelope mapping lives here once rather than in each binding.
 */
export const toEnvelopePayload = (
  event: AlertActionEventEnvelope
): EpisodeActionEnvelopePayload => ({
  occurredAt: event.occurredAt,
  groupHash: event.groupHash,
  episodeId: event.episodeId,
  ruleId: event.ruleId,
  spaceId: event.spaceId,
  actorUid: event.actorUid,
});
