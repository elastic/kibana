/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { renderMarkdown } from '@kbn/adaptive-ui';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { resolveAttachmentVersion } from '@kbn/agent-builder-common/attachments';

import { absolutizeViewSpecHrefs } from '../slack/absolutize_hrefs';
import { toViewSpec } from './attachment_view_specs';

const { tagName, attributes } = renderAttachmentElement;

/**
 * Matches `<render_attachment id="…" version="…"/>` in either attribute order, with or
 * without a self-closing slash. Kept deliberately close to the remark plugin's grammar —
 * the tag shape is owned by {@link renderAttachmentElement}, shared by both.
 */
const renderAttachmentTagPattern = new RegExp(`<${tagName}\\b[^>]*?/?>`, 'g');

const readAttribute = (tag: string, attribute: string): string | undefined =>
  tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']*)["']`))?.[1];

/** Shown when a tag cannot be resolved, so a reply never reaches the surface with raw markup. */
const unresolvedTagFallback = (attachmentId: string | undefined): string =>
  attachmentId
    ? `_(attachment \`${attachmentId}\` is not viewable here — open the conversation in Kibana)_`
    : '';

/**
 * Rewrites an assistant reply so every `<render_attachment>` becomes markdown the
 * destination surface can display, leaving surrounding prose untouched.
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
  if (!new RegExp(renderAttachmentTagPattern.source).test(message)) {
    return message;
  }

  const byId = new Map(attachments.map((attachment) => [attachment.id, attachment]));

  const projected = message.replace(renderAttachmentTagPattern, (tag) => {
    const attachmentId = readAttribute(tag, attributes.attachmentId);
    const attachment = attachmentId ? byId.get(attachmentId) : undefined;

    if (!attachment) {
      return unresolvedTagFallback(attachmentId);
    }

    const version = resolveAttachmentVersion({
      explicitVersion: readAttribute(tag, attributes.version),
      attachmentId: attachment.id,
      attachmentRefs,
      attachment,
    });
    const data = attachment.versions.find((entry) => entry.version === version)?.data;

    if (data === undefined) {
      return unresolvedTagFallback(attachmentId);
    }

    const spec = toViewSpec({ type: attachment.type, data, logger });

    if (!spec) {
      return unresolvedTagFallback(attachmentId);
    }

    return renderMarkdown(kibanaUrl ? absolutizeViewSpecHrefs(spec, kibanaUrl) : spec);
  });

  // Substitution can leave the blank lines that surrounded a tag stacked up.
  return projected.replace(/\n{3,}/g, '\n\n').trim();
};
