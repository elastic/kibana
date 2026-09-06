/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PrimitiveNode, ViewSpec } from '@kbn/adaptive-ui';
import { text } from '@kbn/adaptive-ui/builders';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

import { absolutizeViewSpecHrefs } from '../slack/absolutize_hrefs';
import {
  hasRenderAttachmentTag,
  splitReplyIntoSegments,
  resolveTagToViewSpec,
} from './parse_reply';
import { unresolvedTagFallback } from './project_reply';

const markdown = (body: string): PrimitiveNode => text({ format: 'markdown', body });

/**
 * Inlines one attachment's spec into the parent body.
 *
 * Only `body` carries over structurally, so a card's `title` and `subtitle` would be lost;
 * they are re-emitted as markdown ahead of it. The framing itself is deliberately dropped
 * — the destination surface supplies its own, and Slack has no card chrome to match.
 */
const inlineAttachmentSpec = (spec: ViewSpec): PrimitiveNode[] => {
  const { title, subtitle, body } = spec;
  const heading = [title && `**${title}**`, subtitle].filter(Boolean).join(' — ');

  return [...(heading ? [markdown(heading)] : []), ...body];
};

/**
 * Composes an assistant reply into a single `ViewSpec`: prose runs become markdown text
 * nodes, and each resolvable `<render_attachment>` is replaced by that attachment's
 * primitives, in document order.
 *
 * This is the pivot the outbound projection turns on. One spec means one `render*` call
 * per surface, so Slack Block Kit and markdown are the same composition rendered twice
 * rather than two parallel implementations.
 */
export const composeReplyViewSpec = ({
  message,
  attachments,
  attachmentRefs,
  kibanaUrl,
  logger,
}: {
  message: string;
  attachments: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  /** Public Kibana origin; root-relative `href`s are rewritten against it so links work off-site. */
  kibanaUrl?: string;
  logger?: Logger;
}): ViewSpec => {
  const attachmentsById = new Map(attachments.map((attachment) => [attachment.id, attachment]));

  const body = hasRenderAttachmentTag(message)
    ? splitReplyIntoSegments(message).flatMap((segment) => {
        if (segment.kind === 'prose') {
          return [markdown(segment.body)];
        }

        const { attachmentId, spec } = resolveTagToViewSpec({
          tag: segment.tag,
          attachmentsById,
          attachmentRefs,
          logger,
        });

        if (!spec) {
          const fallback = unresolvedTagFallback(attachmentId);

          return fallback ? [markdown(fallback)] : [];
        }

        return inlineAttachmentSpec(spec);
      })
    : // An untagged reply still composes, so the surface renders one spec either way.
      [markdown(message)].filter(() => message.trim().length > 0);

  // Assembled directly rather than through the `view` builder: the builder's `body` is the
  // strict `BodyNode` union, while an attachment's spec exposes the wider `PrimitiveNode`
  // that `ViewSpec` itself carries, and widening here beats asserting at every inline.
  const composed: ViewSpec = { type: 'view', body };

  return kibanaUrl ? absolutizeViewSpecHrefs(composed, kibanaUrl) : composed;
};
