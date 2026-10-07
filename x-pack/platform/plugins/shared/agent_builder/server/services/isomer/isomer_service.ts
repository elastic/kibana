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
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import { slackProjectionRenderer } from './slack';
import { buildSpec } from './spec';
import type { IsomerProjectionRenderer } from './types';

export interface IsomerService {
  /**
   * Renders the projection of the round's origin through Isomer: the response message becomes a
   * spec, and the origin's renderer renders it. Returns nothing when the origin has no
   * projection, nothing in the message can be rendered, or rendering fails.
   */
  renderProjection(
    event: RoundCompleteEvent,
    options: { originType?: ConversationOriginType }
  ): OriginIsomerProjection | undefined;
}

export class IsomerServiceImpl implements IsomerService {
  /** Looks up attachment types, whose `toSpec` renders attachments in place of their tags. */
  private readonly attachmentsService: AttachmentServiceStart;
  private readonly logger: Logger;

  /** The projection renderers, one per origin type. */
  private readonly projectionRenderers: IsomerProjectionRenderer[] = [slackProjectionRenderer];

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

  renderProjection(
    { data: { round, attachments = [] } }: RoundCompleteEvent,
    { originType }: { originType?: ConversationOriginType }
  ): OriginIsomerProjection | undefined {
    const renderer = this.projectionRenderers.find(({ id }) => id === originType);

    if (!renderer) {
      return undefined;
    }

    try {
      const spec = buildSpec({
        message: round.response.message,
        attachments,
        attachmentRefs: round.input.attachment_refs,
        attachmentsService: this.attachmentsService,
        logger: this.logger,
      });

      if (spec.body.length === 0) {
        this.logger.warn(
          `Leaving out the ${renderer.id} projection: none of the message could be rendered`
        );
        return undefined;
      }

      return { [renderer.id]: renderer.render(spec) };
    } catch (error) {
      this.logger.warn(
        `Leaving out the ${renderer.id} projection: rendering failed: ${error.message}`
      );

      return undefined;
    }
  }
}
