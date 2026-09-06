/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { renderMarkdown } from '@kbn/adaptive-ui';
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

/** Shown when a tag cannot be resolved, so a reply never reaches the surface with raw markup. */
export const unresolvedTagFallback = (attachmentId: string | undefined): string =>
  attachmentId
    ? `_(attachment \`${attachmentId}\` is not viewable here — open the conversation in Kibana)_`
    : '';

/**
 * Rewrites an assistant reply so every `<render_attachment>` becomes markdown the
 * destination surface can display, leaving surrounding prose untouched.
 *
 * This is the projection Relay renders today: it posts `response.message` as a markdown
 * block, so anything landing inside that string reaches Slack with no Relay change.
 */
export const projectReplyToMarkdown = ({
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
}): string => {
  // A reply with nothing to substitute is passed through byte-for-byte; the whitespace
  // cleanup below exists only to tidy up after a removed tag.
  if (!hasRenderAttachmentTag(message)) {
    return message;
  }

  const attachmentsById = new Map(attachments.map((attachment) => [attachment.id, attachment]));

  const projected = splitReplyIntoSegments(message)
    .map((segment) => {
      if (segment.kind === 'prose') {
        return segment.body;
      }

      const { attachmentId, spec } = resolveTagToViewSpec({
        tag: segment.tag,
        attachmentsById,
        attachmentRefs,
        logger,
      });

      if (!spec) {
        return unresolvedTagFallback(attachmentId);
      }

      return renderMarkdown(kibanaUrl ? absolutizeViewSpecHrefs(spec, kibanaUrl) : spec);
    })
    .join('\n\n');

  // Substitution can leave the blank lines that surrounded a tag stacked up.
  return projected.replace(/\n{3,}/g, '\n\n').trim();
};
