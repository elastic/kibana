/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ViewSpec } from '@kbn/adaptive-ui';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { resolveAttachmentVersion } from '@kbn/agent-builder-common/attachments';

import { toViewSpec } from './attachment_view_specs';

const { tagName, attributes } = renderAttachmentElement;

/**
 * Matches `<render_attachment id="…" version="…"/>` in either attribute order, with or
 * without a self-closing slash. Kept deliberately close to the remark plugin's grammar —
 * the tag shape is owned by {@link renderAttachmentElement}, shared by both.
 *
 * A factory because a `/g` regex carries `lastIndex` between calls, and this pattern is
 * used by two independent consumers.
 */
const createTagPattern = (): RegExp => new RegExp(`<${tagName}\\b[^>]*?/?>`, 'g');

export const hasRenderAttachmentTag = (message: string): boolean =>
  new RegExp(`<${tagName}\\b[^>]*?/?>`).test(message);

const readAttribute = (tag: string, attribute: string): string | undefined =>
  tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']*)["']`))?.[1];

export const readTagAttributes = (
  tag: string
): { attachmentId: string | undefined; explicitVersion: string | undefined } => ({
  attachmentId: readAttribute(tag, attributes.attachmentId),
  explicitVersion: readAttribute(tag, attributes.version),
});

/**
 * Resolves one `<render_attachment>` tag to the spec it names, or `undefined` when the id,
 * the version, or the type cannot be resolved. Callers degrade a single tag rather than
 * failing the whole reply.
 */
export const resolveTagToViewSpec = ({
  tag,
  attachmentsById,
  attachmentRefs,
  logger,
}: {
  tag: string;
  attachmentsById: ReadonlyMap<string, VersionedAttachment>;
  attachmentRefs?: AttachmentVersionRef[];
  logger?: Logger;
}): { attachmentId: string | undefined; spec: ViewSpec | undefined } => {
  const { attachmentId, explicitVersion } = readTagAttributes(tag);
  const attachment = attachmentId ? attachmentsById.get(attachmentId) : undefined;

  if (!attachment) {
    return { attachmentId, spec: undefined };
  }

  const version = resolveAttachmentVersion({
    explicitVersion,
    attachmentId: attachment.id,
    attachmentRefs,
    attachment,
  });
  const data = attachment.versions.find((entry) => entry.version === version)?.data;

  if (data === undefined) {
    return { attachmentId, spec: undefined };
  }

  return { attachmentId, spec: toViewSpec({ type: attachment.type, data, logger }) };
};

/** A reply broken into prose runs and the render tags between them, in document order. */
export type ReplySegment = { kind: 'prose'; body: string } | { kind: 'attachment'; tag: string };

/**
 * Splits a reply into its prose runs and render tags, preserving document order.
 *
 * Empty prose runs are dropped, so a reply that is nothing but a tag yields one segment.
 */
export const splitReplyIntoSegments = (message: string): ReplySegment[] => {
  const segments: ReplySegment[] = [];
  const pattern = createTagPattern();
  let lastIndex = 0;

  for (let match = pattern.exec(message); match !== null; match = pattern.exec(message)) {
    const prose = message.slice(lastIndex, match.index).trim();

    if (prose) {
      segments.push({ kind: 'prose', body: prose });
    }

    segments.push({ kind: 'attachment', tag: match[0] });
    lastIndex = match.index + match[0].length;
  }

  const trailing = message.slice(lastIndex).trim();

  if (trailing) {
    segments.push({ kind: 'prose', body: trailing });
  }

  return segments;
};
