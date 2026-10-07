/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType, type RoundCompleteEvent } from '@kbn/agent-builder-common';
import { addSlackProjection } from '../slack/add_slack_projection';
import type { AddProjection, ProjectionContext } from './types';

/** The projection added to the events of rounds from each origin type. */
const projections: Partial<Record<ConversationOriginType, AddProjection>> = {
  [ConversationOriginType.Slack]: addSlackProjection,
};

/**
 * Adds the projection of the round's origin, rendered through Isomer, to the `round_complete`
 * event. Returns the event unchanged when the origin has no projection, or it can't be rendered.
 */
export const addIsomerProjections = (
  event: RoundCompleteEvent,
  { originType, ...context }: ProjectionContext & { originType?: ConversationOriginType }
): RoundCompleteEvent => {
  const addProjection = originType && projections[originType];

  return addProjection ? addProjection(event, context) : event;
};
