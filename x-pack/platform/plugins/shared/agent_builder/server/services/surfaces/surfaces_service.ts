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
import type { AttachmentSurfaceCompositionContext } from '@kbn/agent-builder-server/attachments';
import type { IsomerPluginStart } from '@kbn/isomer-plugin/server';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import { buildComposition } from './composition';
import { slackSurface } from './slack';
import type { SurfaceRenderer } from './types';

export interface SurfacesService {
  /** Renders the round's surface payload, or resolves to nothing when unavailable or rendering fails. */
  renderPayload(
    event: RoundCompleteEvent,
    options: { originType?: ConversationOriginType } & AttachmentSurfaceCompositionContext
  ): Promise<SurfacePayload | undefined>;
}

export class SurfacesServiceImpl implements SurfacesService {
  private readonly attachmentsService: AttachmentServiceStart;
  private readonly logger: Logger;
  private readonly isomer: IsomerPluginStart;
  private readonly surfaceRenderers: SurfaceRenderer[] = [slackSurface];

  constructor({
    attachmentsService,
    logger,
    isomer,
  }: {
    attachmentsService: AttachmentServiceStart;
    logger: Logger;
    isomer: IsomerPluginStart;
  }) {
    this.attachmentsService = attachmentsService;
    this.logger = logger;
    this.isomer = isomer;
  }

  async renderPayload(
    { data: { round, attachments = [] } }: RoundCompleteEvent,
    {
      originType,
      request,
      spaceId,
    }: { originType?: ConversationOriginType } & AttachmentSurfaceCompositionContext
  ): Promise<SurfacePayload | undefined> {
    const renderer = this.surfaceRenderers.find(({ id }) => id === originType);

    if (!renderer) {
      return undefined;
    }

    try {
      const runtime = await this.isomer.getRuntime();

      const composition = await buildComposition({
        round,
        attachments,
        attachmentsService: this.attachmentsService,
        context: { request, spaceId },
        logger: this.logger,
        runtime,
      });

      return composition.body.length > 0 ? renderer.render(composition, runtime) : undefined;
    } catch (error) {
      this.logger.error(`Failed to render the ${renderer.id} surface payload: ${error.message}`);

      return undefined;
    }
  }
}
