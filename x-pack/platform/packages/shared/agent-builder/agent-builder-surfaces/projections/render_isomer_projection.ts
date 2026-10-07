/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationOriginType,
  OriginIsomerProjection,
  RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { slackProjection } from '../slack';
import type { ProjectionContext, IsomerProjectionDefinition } from './types';

/** The projections of rounds, one per origin type. */
const projectionDefinitions: IsomerProjectionDefinition[] = [slackProjection];

/**
 * Renders the projection of the round's origin through Isomer. Returns nothing when the origin
 * has no projection, or it can't be rendered.
 */
export const renderIsomerProjection = (
  event: RoundCompleteEvent,
  { originType, ...context }: ProjectionContext & { originType?: ConversationOriginType }
): OriginIsomerProjection | undefined => {
  const definition = projectionDefinitions.find(({ id }) => id === originType);

  if (!definition) {
    return undefined;
  }

  const projection = definition.render(event, context);

  if (!projection) {
    return undefined;
  }

  return { [definition.id]: projection };
};
