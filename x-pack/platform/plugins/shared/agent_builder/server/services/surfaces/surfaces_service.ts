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
import type { SlackAssetSource } from './slack_assets';
import type { SurfaceRenderer } from './types';

/** Options for {@link SurfacesService.renderPayload}. */
export type RenderPayloadOptions = {
  originType?: ConversationOriginType;
  /** Whether the poster uploads the payload's assets, such as images. Defaults to false. */
  assets?: boolean;
} & AttachmentSurfaceCompositionContext;

export interface SurfacesService {
  /**
   * Renders the round's surface payload, or resolves to nothing when unavailable or rendering fails.
   * With `assets`, image nodes ship files for the poster to upload; otherwise they render as text.
   */
  renderPayload(
    event: RoundCompleteEvent,
    options: RenderPayloadOptions
  ): Promise<SurfacePayload | undefined>;
}

export class SurfacesServiceImpl implements SurfacesService {
  private readonly attachmentsService: AttachmentServiceStart;
  private readonly logger: Logger;
  private readonly isomer: IsomerPluginStart;
  private readonly assetSources: readonly SlackAssetSource[];
  private readonly getBaseUrl: (spaceId: string) => string | undefined;
  private readonly surfaceRenderers: SurfaceRenderer[] = [slackSurface];

  constructor({
    attachmentsService,
    logger,
    isomer,
    assetSources = [],
    getBaseUrl = () => undefined,
  }: {
    attachmentsService: AttachmentServiceStart;
    logger: Logger;
    isomer: IsomerPluginStart;
    /** Load the files of nodes a surface shows as images, by node type. */
    assetSources?: readonly SlackAssetSource[];
    /** The space's Kibana URL, which Kibana app links resolve against on the surface. */
    getBaseUrl?: (spaceId: string) => string | undefined;
  }) {
    this.attachmentsService = attachmentsService;
    this.logger = logger;
    this.isomer = isomer;
    this.assetSources = assetSources;
    this.getBaseUrl = getBaseUrl;
  }

  async renderPayload(
    { data: { round, attachments = [] } }: RoundCompleteEvent,
    { originType, assets = false, request, spaceId }: RenderPayloadOptions
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

      if (composition.body.length === 0) {
        return undefined;
      }

      return await renderer.render(composition, {
        runtime,
        context: { request, spaceId },
        assets,
        assetSources: this.assetSources,
        logger: this.logger,
        baseUrl: this.getBaseUrl(spaceId),
      });
    } catch (error) {
      this.logger.error(`Failed to render the ${renderer.id} surface payload: ${error.message}`);

      return undefined;
    }
  }
}
