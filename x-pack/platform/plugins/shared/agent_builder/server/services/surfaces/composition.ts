/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValidationError } from '@elastic/isomer-sdk';
import { splitAuthoredMarkdown } from '@elastic/isomer-sdk/markdown';
import type { ConversationRound } from '@kbn/agent-builder-common';
import {
  getLatestVersion,
  getVersion,
  toAttachment,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import {
  renderAttachmentElement,
  type RenderAttachmentElementAttributes,
} from '@kbn/agent-builder-common/tools/custom_rendering';
import type {
  AttachmentSurfaceCompositionContext,
  SurfaceComposition,
  SurfaceNode,
  MarkdownNode,
} from '@kbn/agent-builder-server/attachments';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';
import type { Logger } from '@kbn/logging';
import type { AttachmentServiceStart } from '../attachments';

const { tagName, attributes } = renderAttachmentElement;

/**
 * A `<render_attachment>` tag of the response message, with its attributes as written. Its
 * version is validated when the attachment is resolved.
 */
interface AttachmentNode extends RenderAttachmentElementAttributes {
  type: 'attachment';
  attachmentId: string;
}

/** The response message split into its markdown and its attachment tags, in order. */
type MessageNode = SurfaceNode | AttachmentNode;

/**
 * Splits a message into nodes with {@link splitAuthoredMarkdown}: its markdown becomes `markdown`
 * nodes, and each `<render_attachment>` tag becomes an `attachment` node. Tags without an id are
 * dropped.
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
  splitAuthoredMarkdown(message, { elements: [tagName] }).flatMap((segment): MessageNode[] => {
    if (segment.type === 'markdown') {
      return [{ type: 'markdown', text: segment.source }];
    }

    const { [attributes.attachmentId]: attachmentId, [attributes.version]: version } =
      segment.attributes;

    return attachmentId ? [{ type: 'attachment', attachmentId, version }] : [];
  });

/**
 * Keeps the `title` and `subtitle` of an attachment's composition, which would otherwise be lost
 * when its body is spliced into the message: they become a `markdown` node, with the title in bold
 * and the subtitle in italics, placed before the body. Returns nothing when the mapping sets
 * neither, so it's `toSurfaceComposition` that decides whether an attachment has a heading.
 */
const toHeadingNode = ({ title, subtitle }: SurfaceComposition): MarkdownNode[] => {
  const heading = [title && `**${title}**`, subtitle && `_${subtitle}_`].filter(Boolean).join('\n');
  return heading ? [{ type: 'markdown', text: heading }] : [];
};

/**
 * Replaces an attachment node with what its type's `toSurfaceComposition` returns. Attachments
 * that are missing or have no `toSurfaceComposition` are expected, and left out quietly. A
 * `toSurfaceComposition` that fails or returns an invalid composition is a bug in its mapping, so
 * it's left out with a warning, and the rest of the message still renders.
 */
const resolveAttachmentNode = async (
  node: AttachmentNode,
  {
    attachments,
    attachmentsService,
    context,
    logger,
    runtime,
  }: {
    attachments: VersionedAttachment[];
    attachmentsService: AttachmentServiceStart;
    context: AttachmentSurfaceCompositionContext;
    logger: Logger;
    runtime: KibanaIsomerRuntime;
  }
): Promise<SurfaceNode[]> => {
  const attachment = attachments.find(({ id }) => id === node.attachmentId);

  if (!attachment) {
    logger.debug(`Leaving out attachment "${node.attachmentId}": it is not in the conversation`);
    return [];
  }

  const explicitVersion = Number(node.version);

  // Without a valid version, use the latest one, which includes updates made during the round.
  const attachmentVersion =
    Number.isInteger(explicitVersion) && explicitVersion > 0
      ? getVersion(attachment, explicitVersion)
      : getLatestVersion(attachment);

  if (!attachmentVersion) {
    logger.debug(`Leaving out attachment "${attachment.id}": version ${node.version} not found`);
    return [];
  }

  const toSurfaceComposition = attachmentsService.getTypeDefinition(
    attachment.type
  )?.toSurfaceComposition;

  if (!toSurfaceComposition) {
    logger.debug(
      `Leaving out attachment "${attachment.id}": type "${attachment.type}" has no toSurfaceComposition`
    );

    return [];
  }

  try {
    const composition = await toSurfaceComposition(
      toAttachment(attachment, attachmentVersion),
      context
    );

    const { valid, errors } = runtime.validate(composition);

    if (!valid) {
      const reasons = errors.map(formatValidationError).join('; ');

      logger.warn(
        `Leaving out attachment "${attachment.id}": its toSurfaceComposition returned an invalid composition: ${reasons}`
      );

      return [];
    }

    return [...toHeadingNode(composition), ...composition.body];
  } catch (error) {
    logger.warn(
      `Leaving out attachment "${attachment.id}": its toSurfaceComposition failed: ${error.message}`
    );

    return [];
  }
};

/**
 * Builds the Isomer composition of a response message: its markdown becomes `markdown` nodes,
 * and each `<render_attachment>` tag is replaced, in place, by what its type's
 * `toSurfaceComposition` returns.
 */
export const buildComposition = async ({
  round: { response },
  attachments,
  attachmentsService,
  context,
  logger,
  runtime,
}: {
  round: ConversationRound;
  attachments: VersionedAttachment[];
  attachmentsService: AttachmentServiceStart;
  context: AttachmentSurfaceCompositionContext;
  logger: Logger;
  runtime: KibanaIsomerRuntime;
}): Promise<SurfaceComposition> => {
  const nodes = await Promise.all(
    toMessageNodes(response.message).map((node): Promise<SurfaceNode[]> | SurfaceNode[] =>
      node.type === 'attachment'
        ? resolveAttachmentNode(node, { attachments, attachmentsService, context, logger, runtime })
        : [node]
    )
  );

  return { type: 'view', body: nodes.flat() };
};
