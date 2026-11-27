/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationOriginType,
  SurfacePayload,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { IBasePath } from '@kbn/core/server';
import type { IsomerPluginStart } from '@kbn/isomer-plugin/server';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import { getPublicKibanaUrl } from '../../utils/get_kibana_url';
import { buildComposition } from './composition';
import { promptsToNodes } from './prompts';
import { slackSurface } from './slack';
import type { SurfaceRenderer } from './types';

/** What a round wrote for its reader: its message, and the prompts it paused on. */
export interface SurfaceResponse {
  message: string;
  attachments: VersionedAttachment[];
  /** Prompts the round is waiting on, asked after the message. */
  prompts?: PromptRequest[];
}

export interface SurfacesService {
  /** Renders a response message for its surface, or resolves to nothing when unavailable or rendering fails. */
  renderPayload(
    response: SurfaceResponse,
    options: { originType?: ConversationOriginType; agentId: string } & AttachmentFormatContext
  ): Promise<SurfacePayload | undefined>;
}

export class SurfacesServiceImpl implements SurfacesService {
  private readonly attachmentsService: AttachmentServiceStart;
  private readonly logger: Logger;
  private readonly isomer: IsomerPluginStart;
  private readonly basePath: IBasePath;
  private readonly cloud: CloudSetup | undefined;
  private readonly surfaceRenderers: SurfaceRenderer[] = [slackSurface];

  constructor({
    attachmentsService,
    logger,
    isomer,
    basePath,
    cloud,
  }: {
    attachmentsService: AttachmentServiceStart;
    logger: Logger;
    isomer: IsomerPluginStart;
    basePath: IBasePath;
    cloud: CloudSetup | undefined;
  }) {
    this.attachmentsService = attachmentsService;
    this.logger = logger;
    this.isomer = isomer;
    this.basePath = basePath;
    this.cloud = cloud;
  }

  async renderPayload(
    { message, attachments, prompts = [] }: SurfaceResponse,
    {
      originType,
      agentId,
      request,
      spaceId,
    }: { originType?: ConversationOriginType; agentId: string } & AttachmentFormatContext
  ): Promise<SurfacePayload | undefined> {
    const renderer = this.surfaceRenderers.find(({ id }) => id === originType);

    if (!renderer) {
      return undefined;
    }

    try {
      const runtime = await this.isomer.getRuntime();
      const kibanaUrl = getPublicKibanaUrl(this.basePath, this.cloud, spaceId);

      const composition = await buildComposition({
        message,
        attachments,
        attachmentsService: this.attachmentsService,
        context: { request, spaceId, agentId },
        logger: this.logger,
        runtime,
      });

      const body = [...composition.body, ...promptsToNodes(prompts, runtime)];

      return body.length > 0
        ? renderer.render({ ...composition, body }, runtime, { baseUrl: kibanaUrl })
        : undefined;
    } catch (error) {
      this.logger.error(`Failed to render the ${renderer.id} surface payload: ${error.message}`);

      return undefined;
    }
  }
}
