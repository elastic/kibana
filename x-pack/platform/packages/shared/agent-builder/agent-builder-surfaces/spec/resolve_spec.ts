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
import type { Logger } from '@kbn/logging';
import type { AttachmentNode, AttachmentSpec, MarkdownNode, Spec, SpecNode } from './pack';

export interface AttachmentSpecContext {
  attachment: VersionedAttachment;
  version: number;
}

/** Maps the data of one attachment version to the composition shown in its place. */
export type AttachmentSpecMapping<TContent = unknown> = (
  data: TContent,
  context: AttachmentSpecContext
) => AttachmentSpec;

export interface ResolveSpecOptions {
  /** The conversation's attachments, as carried by `round_complete`. */
  attachments: VersionedAttachment[];
  /** The round's attachment refs, which pick the version of tags without one. */
  attachmentRefs?: AttachmentVersionRef[];
  getMapping: (type: string) => AttachmentSpecMapping | undefined;
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

const toHeadingNode = ({ title, subtitle }: AttachmentSpec): MarkdownNode[] => {
  const heading = [title && `**${title}**`, subtitle && `_${subtitle}_`].filter(Boolean).join('\n');
  return heading ? [{ type: 'markdown', text: heading }] : [];
};

const resolveAttachmentNode = (
  node: AttachmentNode,
  { attachments, attachmentRefs, getMapping, logger }: ResolveSpecOptions
): MarkdownNode[] => {
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

  const mapping = getMapping(attachment.type);
  if (!mapping) {
    logger.debug(
      `Leaving out attachment "${attachment.id}": type "${attachment.type}" has no toSpec`
    );
    return [];
  }

  try {
    const spec = mapping(attachmentVersion.data, {
      attachment,
      version: attachmentVersion.version,
    });
    return [...toHeadingNode(spec), ...spec.body];
  } catch (error) {
    logger.warn(`Leaving out attachment "${attachment.id}": its toSpec failed: ${error.message}`);
    return [];
  }
};

/**
 * Replaces the spec's attachment nodes with what their type's mapping returns. Attachments that
 * are missing, have no mapping, or fail to map are left out.
 */
export const resolveSpec = (spec: Spec, options: ResolveSpecOptions): Spec => ({
  ...spec,
  body: spec.body.flatMap((node): SpecNode[] =>
    node.type === 'attachment' ? resolveAttachmentNode(node, options) : [node]
  ),
});
