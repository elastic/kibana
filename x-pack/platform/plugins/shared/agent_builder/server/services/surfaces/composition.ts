/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
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
  type RenderAttachmentElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  IsomerComposition,
  IsomerNode,
  MarkdownNode,
} from '@kbn/agent-builder-server/attachments';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';

const { tagName, attributes } = renderAttachmentElement;

/**
 * A `<render_attachment>` tag of the response message, with its attributes as written. Its
 * version is validated when it's resolved, by `resolveAttachmentVersion`.
 */
interface AttachmentNode extends RenderAttachmentElementAttributes {
  type: 'attachment';
  attachmentId: string;
}

/** The response message split into its markdown and its attachment tags, in order. */
type MessageNode = IsomerNode | AttachmentNode;

const toAttachmentNode = (tag: string): AttachmentNode | undefined => {
  const attachmentId = getCustomElementAttribute(tag, attributes.attachmentId);
  if (!attachmentId) {
    return;
  }

  return {
    type: 'attachment',
    attachmentId,
    version: getCustomElementAttribute(tag, attributes.version),
  };
};

/**
 * Splits a message into nodes: its markdown becomes `markdown` nodes, and each
 * `<render_attachment>` tag becomes an `attachment` node at the same position. Tags without an
 * id are dropped.
 *
 * For example, `Here is the note: <render_attachment id="a1" /> Anything else?` splits into:
 *
 * ```ts
 * [
 *   { type: 'markdown', text: 'Here is the note:' },
 *   { type: 'attachment', attachmentId: 'a1' },
 *   { type: 'markdown', text: 'Anything else?' },
 * ]
 * ```
 */
const toMessageNodes = (message: string): MessageNode[] =>
  splitCustomElements(message, tagName).flatMap((segment): MessageNode[] => {
    if (segment.type === 'text') {
      return [{ type: 'markdown', text: segment.text.trim() }];
    }

    const node = toAttachmentNode(segment.tag);
    return node ? [node] : [];
  });

/**
 * Keeps the `title` and `subtitle` of an attachment's composition, which would otherwise be lost
 * when its body is spliced into the message: they become a `markdown` node, with the title in bold
 * and the subtitle in italics, placed before the body. Returns nothing when the mapping sets
 * neither, so it's `toIsomerComposition` that decides whether an attachment has a heading.
 */
const toHeadingNode = ({ title, subtitle }: IsomerComposition): MarkdownNode[] => {
  const heading = [title && `**${title}**`, subtitle && `_${subtitle}_`].filter(Boolean).join('\n');
  return heading ? [{ type: 'markdown', text: heading }] : [];
};

/**
 * Replaces an attachment node with what its type's `toIsomerComposition` returns. Attachments
 * that are missing or have no `toIsomerComposition` are expected, and left out quietly. A
 * `toIsomerComposition` that fails is a bug in its mapping, so it's left out with a warning.
 */
const resolveAttachmentNode = (
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
): IsomerNode[] => {
  const attachment = attachments.find(({ id }) => id === node.attachmentId);

  if (!attachment) {
    logger.debug(`Leaving out attachment "${node.attachmentId}": it is not in the conversation`);
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
    logger.debug(`Leaving out attachment "${attachment.id}": version ${version} not found`);
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
 * `toIsomerComposition` returns.
 */
export const buildComposition = ({
  round: { response, input },
  attachments,
  attachmentsService,
  logger,
}: {
  round: ConversationRound;
  /** The conversation's attachments, as carried by `round_complete`. */
  attachments: VersionedAttachment[];
  attachmentsService: AttachmentServiceStart;
  logger: Logger;
}): IsomerComposition => ({
  type: 'view',
  body: toMessageNodes(response.message).flatMap((node): IsomerNode[] =>
    node.type === 'attachment'
      ? resolveAttachmentNode(node, {
          attachments,
          attachmentRefs: input.attachment_refs,
          attachmentsService,
          logger,
        })
      : [node]
  ),
});
