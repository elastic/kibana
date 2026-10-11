/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationOriginType,
  RoundCompleteEvent,
  SurfacePayload,
} from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import { buildComposition } from './composition';
import { slackSurface } from './slack';
import type { SurfaceRenderer } from './types';

export interface SurfacesService {
  /**
   * Renders the response message for the surface the round came from: the message becomes an
   * Isomer composition, and the surface's renderer renders it. Returns nothing when the origin
   * has no surface, nothing in the message can be rendered, or rendering fails.
   */
  renderPayload(
    event: RoundCompleteEvent,
    options: { originType?: ConversationOriginType }
  ): SurfacePayload | undefined;
}

export class SurfacesServiceImpl implements SurfacesService {
  /** Looks up attachment types, whose `toSurfaceComposition` renders attachments in place of their tags. */
  private readonly attachmentsService: AttachmentServiceStart;
  private readonly logger: Logger;

  /** The surface renderers, one per origin type. */
  private readonly surfaceRenderers: SurfaceRenderer[] = [slackSurface];

  constructor({
    attachmentsService,
    logger,
  }: {
    attachmentsService: AttachmentServiceStart;
    logger: Logger;
  }) {
    this.attachmentsService = attachmentsService;
    this.logger = logger;
  }

  renderPayload(
    { data: { round, attachments = [] } }: RoundCompleteEvent,
    { originType }: { originType?: ConversationOriginType }
  ): SurfacePayload | undefined {
    const renderer = this.surfaceRenderers.find(({ id }) => id === originType);

    if (!renderer) {
      return undefined;
    }

    try {
      const composition = buildComposition({
        round,
        attachments,
        attachmentsService: this.attachmentsService,
        logger: this.logger,
      });

      return composition.body.length > 0 ? renderer.render(composition) : undefined;
    } catch (error) {
      this.logger.error(`Failed to render the ${renderer.id} surface payload: ${error.message}`);

      return undefined;
    }
  }
}
