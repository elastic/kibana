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
import { replyToSpec } from '../spec/reply_to_spec';
import { resolveSpec } from '../spec/resolve_spec';
import type { ProjectionContext, IsomerProjectionDefinition } from './types';

/** The projections of rounds, one per origin type. */
const projectionDefinitions: IsomerProjectionDefinition[] = [slackProjection];

/**
 * Renders the projection of the round's origin through Isomer: the reply becomes a spec, its
 * attachments are resolved, and the origin's definition renders it. Returns nothing when the
 * origin has no projection, nothing in the reply can be rendered, or rendering fails.
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
    const spec = replyToSpec(round.response.message);

    if (!spec) {
      logger.warn(`Leaving out the ${definition.id} projection: the reply is empty`);
      return undefined;
    }

    const resolved = resolveSpec(spec, {
      attachments,
      attachmentRefs: round.input.attachment_refs,
      getMapping: (type) => attachmentsService.getTypeDefinition(type)?.toSpec,
      logger,
    });

    if (resolved.body.length === 0) {
      logger.warn(
        `Leaving out the ${definition.id} projection: none of the reply could be rendered`
      );
      return undefined;
    }

    return { [definition.id]: definition.render(resolved) };
  } catch (error) {
    logger.warn(`Leaving out the ${definition.id} projection: rendering failed: ${error.message}`);

    return undefined;
  }
};
