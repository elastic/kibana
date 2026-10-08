/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationOriginType,
  ConversationRound,
  RoundCompleteEvent,
  SurfacePayload,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import { resolveAttachmentNode, toCompositionNodes } from './composition';
import type { CompositionNode, MessageComposition } from './pack';
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
  /** Looks up attachment types, whose `toIsomerComposition` renders attachments in place of their tags. */
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
      const composition = this.buildComposition(round, attachments);

      if (composition.body.length === 0) {
        this.logger.warn(
          `Leaving out the ${renderer.id} surface payload: none of the message could be rendered`
        );
        return undefined;
      }

      return renderer.render(composition);
    } catch (error) {
      this.logger.warn(
        `Leaving out the ${renderer.id} surface payload: rendering failed: ${error.message}`
      );

      return undefined;
    }
  }

  /**
   * Builds the Isomer composition of a response message: its markdown becomes `markdown` nodes,
   * and each `<render_attachment>` tag is replaced, in place, by what its type's
   * `toIsomerComposition` returns.
   */
  private buildComposition(
    { response, input }: ConversationRound,
    attachments: VersionedAttachment[]
  ): MessageComposition {
    return {
      type: 'view',
      body: toCompositionNodes(response.message).flatMap((node): CompositionNode[] =>
        node.type === 'attachment'
          ? resolveAttachmentNode(node, {
              attachments,
              attachmentRefs: input.attachment_refs,
              attachmentsService: this.attachmentsService,
              logger: this.logger,
            })
          : [node]
      ),
    };
  }
}
