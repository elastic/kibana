/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getVersion,
  type AttachmentVersionRef,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { renderAttachmentElement } from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  AttachmentIsomerComposition,
  IsomerMarkdownNode,
} from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import type { AttachmentNode, CompositionNode, MessageComposition } from './pack';

const { tagName, attributes } = renderAttachmentElement;

const createTagPattern = () => new RegExp(`<${tagName}\\b[^>]*\\/?>`, 'gi');

/** Matches the attribute at the start or after whitespace, so `id` doesn't match `field-id`. */
const getAttribute = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'))?.[1];

const toAttachmentNode = (tag: string): AttachmentNode | undefined => {
  const attachmentId = getAttribute(tag, attributes.attachmentId);
  if (!attachmentId) {
    return;
  }

  const version = Number(getAttribute(tag, attributes.version));

  return {
    type: 'attachment',
    attachmentId,
    ...(Number.isInteger(version) && version > 0 ? { version } : {}),
  };
};

/**
 * Splits a message into nodes: its markdown becomes `markdown` nodes, and each
 * `<render_attachment>` tag becomes an `attachment` node at the same position. Tags without an
 * id are dropped.
 */
const toCompositionNodes = (message: string): CompositionNode[] => {
  const nodes: CompositionNode[] = [];
  let cursor = 0;

  const pushMarkdown = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      nodes.push({ type: 'markdown', text: trimmed });
    }
  };

  for (const match of message.matchAll(createTagPattern())) {
    pushMarkdown(message.slice(cursor, match.index));

    const node = toAttachmentNode(match[0]);
    if (node) {
      nodes.push(node);
    }

    cursor = match.index + match[0].length;
  }

  pushMarkdown(message.slice(cursor));

  return nodes;
};

export interface BuildCompositionOptions {
  /** The response message, with its `<render_attachment>` tags. */
  message: string;
  /** The conversation's attachments, as carried by `round_complete`. */
  attachments: VersionedAttachment[];
  /** The round's attachment refs, which pick the version of tags without one. */
  attachmentRefs?: AttachmentVersionRef[];
  attachmentsService: AttachmentServiceStart;
  logger: Logger;
}

/**
 * Resolves a tag's version like the Kibana UI does: its own version, else the round's ref, else
 * the latest version.
 */
const resolveVersion = (
  { attachmentId, version }: AttachmentNode,
  attachment: VersionedAttachment,
  attachmentRefs: AttachmentVersionRef[] = []
): number | undefined =>
  version ??
  attachmentRefs.find((ref) => ref.attachment_id === attachmentId)?.version ??
  attachment.versions.at(-1)?.version;

const toHeadingNode = ({ title, subtitle }: AttachmentIsomerComposition): IsomerMarkdownNode[] => {
  const heading = [title && `**${title}**`, subtitle && `_${subtitle}_`].filter(Boolean).join('\n');
  return heading ? [{ type: 'markdown', text: heading }] : [];
};

const resolveAttachmentNode = (
  node: AttachmentNode,
  { attachments, attachmentRefs, attachmentsService, logger }: BuildCompositionOptions
): IsomerMarkdownNode[] => {
  const attachment = attachments.find(({ id }) => id === node.attachmentId);
  if (!attachment) {
    logger.warn(`Leaving out attachment "${node.attachmentId}": it is not in the conversation`);
    return [];
  }

  const version = resolveVersion(node, attachment, attachmentRefs);
  const attachmentVersion = version === undefined ? undefined : getVersion(attachment, version);
  if (!attachmentVersion) {
    logger.warn(`Leaving out attachment "${attachment.id}": version ${version} not found`);
    return [];
  }

  const toIsomerComposition = attachmentsService.getTypeDefinition(
    attachment.type
  )?.toIsomerComposition;
  if (!toIsomerComposition) {
    logger.debug(
      `Leaving out attachment "${attachment.id}": type "${attachment.type}" has no toIsomerComposition`
    );
    return [];
  }

  try {
    const composition = toIsomerComposition(attachmentVersion.data, {
      attachment,
      version: attachmentVersion.version,
    });
    return [...toHeadingNode(composition), ...composition.body];
  } catch (error) {
    logger.warn(
      `Leaving out attachment "${attachment.id}": its toIsomerComposition failed: ${error.message}`
    );
    return [];
  }
};

/**
 * Builds the Isomer composition of a response message: its markdown becomes `markdown` nodes,
 * and each `<render_attachment>` tag is replaced, in place, by what its type's
 * `toIsomerComposition` returns. Attachments that are missing, have no `toIsomerComposition`, or
 * fail to map are left out.
 */
export const buildComposition = (options: BuildCompositionOptions): MessageComposition => ({
  type: 'view',
  body: toCompositionNodes(options.message).flatMap((node): CompositionNode[] =>
    node.type === 'attachment' ? resolveAttachmentNode(node, options) : [node]
  ),
});
