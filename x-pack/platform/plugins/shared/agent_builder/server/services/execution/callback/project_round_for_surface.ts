/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { ConversationOriginType, RoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentExecution, SurfaceProjectorDefinition } from '@kbn/agent-builder-server';
import type { SurfaceProjectionServiceStart } from '../../surface_projection';

/** Origin type of the execution, when it came from an external surface. */
export const getExecutionSurface = (
  execution: AgentExecution
): ConversationOriginType | undefined =>
  execution.executionMode === AgentExecutionMode.conversation
    ? execution.agentParams.origin?.type
    : undefined;

export const getSurfaceProjector = ({
  execution,
  surfaceProjection,
}: {
  execution: AgentExecution;
  surfaceProjection?: SurfaceProjectionServiceStart;
}): SurfaceProjectorDefinition | undefined => {
  const surface = getExecutionSurface(execution);

  return surface && surfaceProjection ? surfaceProjection.getProjector(surface) : undefined;
};

/**
 * Returns a delivery-only copy of `event` whose response message has been rewritten
 * for the execution's surface, leaving the original untouched — it is shared with the
 * persistence subscriber, so the Kibana transcript keeps its `<render_attachment>` tags.
 *
 * Degrades to the original event whenever projection is unavailable or fails: a
 * readable-but-unprojected Slack post beats a dropped one.
 */
export const projectRoundForSurface = async ({
  execution,
  event,
  projector,
  logger,
}: {
  execution: AgentExecution;
  event: RoundCompleteEvent;
  projector: SurfaceProjectorDefinition;
  logger: Logger;
}): Promise<RoundCompleteEvent> => {
  const { round, attachments } = event.data;
  const message = round.response?.message;

  if (!message) {
    return event;
  }

  try {
    const projection = await projector.project({
      message,
      attachments: attachments ?? [],
      attachmentRefs: round.input?.attachment_refs,
      spaceId: execution.spaceId,
    });

    if (!projection) {
      return event;
    }

    return {
      ...event,
      data: {
        ...event.data,
        round: {
          ...round,
          response: { ...round.response, message: projection.message },
        },
      },
    };
  } catch (error) {
    logger.warn(
      `Surface projection failed for surface "${projector.surface}", delivering the unprojected reply: ${error.message}`
    );

    return event;
  }
};
