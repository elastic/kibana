/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getVersion,
  resolveAttachmentVersion,
  type AttachmentVersionRef,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  getCustomElementAttribute,
  renderAttachmentElement,
  splitCustomElements,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  AttachmentIsomerComposition,
  IsomerMarkdownNode,
} from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';
import type { AttachmentNode, CompositionNode } from './pack';

const { tagName, attributes } = renderAttachmentElement;

const toAttachmentNode = (tag: string): AttachmentNode | undefined => {
  const attachmentId = getCustomElementAttribute(tag, attributes.attachmentId);
  if (!attachmentId) {
    return;
  }

  const version = Number(getCustomElementAttribute(tag, attributes.version));

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
export const toCompositionNodes = (message: string): CompositionNode[] =>
  splitCustomElements(message, tagName).flatMap((segment): CompositionNode[] => {
    if (segment.type === 'text') {
      return [{ type: 'markdown', text: segment.text.trim() }];
    }

    const node = toAttachmentNode(segment.tag);
    return node ? [node] : [];
  });

const toHeadingNode = ({ title, subtitle }: AttachmentIsomerComposition): IsomerMarkdownNode[] => {
  const heading = [title && `**${title}**`, subtitle && `_${subtitle}_`].filter(Boolean).join('\n');
  return heading ? [{ type: 'markdown', text: heading }] : [];
};

/**
 * Replaces an attachment node with what its type's `toIsomerComposition` returns. Attachments
 * that are missing, have no `toIsomerComposition`, or fail to map are left out.
 */
export const resolveAttachmentNode = (
  node: AttachmentNode,
  {
    attachments,
    attachmentRefs,
    attachmentsService,
    logger,
  }: {
    /** The conversation's attachments, as carried by `round_complete`. */
    attachments: VersionedAttachment[];
    /** The round's attachment refs, which pick the version of tags without one. */
    attachmentRefs?: AttachmentVersionRef[];
    attachmentsService: AttachmentServiceStart;
    logger: Logger;
  }
): IsomerMarkdownNode[] => {
  const attachment = attachments.find(({ id }) => id === node.attachmentId);
  if (!attachment) {
    logger.warn(`Leaving out attachment "${node.attachmentId}": it is not in the conversation`);
    return [];
  }

  const version = resolveAttachmentVersion({
    explicitVersion: node.version,
    attachmentId: node.attachmentId,
    attachmentRefs,
    attachment,
  });
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
