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
import { slackProjection } from './slack';
import { buildSpec } from './spec';
import type { ProjectionContext, IsomerProjectionDefinition } from './types';

/** The projections of rounds, one per origin type. */
const projectionDefinitions: IsomerProjectionDefinition[] = [slackProjection];

/**
 * Renders the projection of the round's origin through Isomer: the reply becomes a spec, and the
 * origin's definition renders it. Returns nothing when the origin has no projection, nothing in
 * the reply can be rendered, or rendering fails.
 */
export const renderIsomerProjection = (
  { data: { round, attachments = [] } }: RoundCompleteEvent,
  {
    originType,
    attachmentsService,
    logger,
  }: ProjectionContext & { originType?: ConversationOriginType }
): OriginIsomerProjection | undefined => {
  const definition = projectionDefinitions.find(({ id }) => id === originType);

  if (!definition) {
    return undefined;
  }

  try {
    const spec = buildSpec({
      message: round.response.message,
      attachments,
      attachmentRefs: round.input.attachment_refs,
      attachmentsService,
      logger,
    });

    if (spec.body.length === 0) {
      logger.warn(
        `Leaving out the ${definition.id} projection: none of the reply could be rendered`
      );
      return undefined;
    }

    return { [definition.id]: definition.render(spec) };
  } catch (error) {
    logger.warn(`Leaving out the ${definition.id} projection: rendering failed: ${error.message}`);

    return undefined;
  }
};
