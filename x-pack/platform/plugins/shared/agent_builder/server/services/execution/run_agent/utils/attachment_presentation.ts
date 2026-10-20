/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion, type AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';

/**
 * Formats attachment metadata (id/type/version/estimated tokens/description) as XML.
 * Returns `''` for an empty list.
 */
export const formatAttachmentsMetadata = (
  attachmentRefs: AttachmentVersionRef[],
  attachmentStateManager: AttachmentStateManager
): string => {
  if (attachmentRefs.length === 0) {
    return '';
  }

  const attachmentElements: XmlNode[] = attachmentRefs.flatMap((attachmentRef) => {
    const attachment = attachmentStateManager.getAttachmentRecord(attachmentRef.attachment_id);
    if (!attachment) {
      return [];
    }
    const attachmentVersion =
      attachment.versions.find((aVer) => aVer.version === attachmentRef.version) ??
      getLatestVersion(attachment);
    if (!attachmentVersion) {
      return [];
    }

    return [
      {
        tagName: 'attachment',
        attributes: {
          attachment_id: attachment.id,
          type: attachment.type,
          operation: attachmentRef.operation,
          actor: attachmentRef.actor,
          version: attachmentVersion.version,
          estimated_tokens: attachmentVersion.estimated_tokens,
          description: attachment.description,
        },
      } satisfies XmlNode,
    ];
  });

  if (attachmentElements.length === 0) {
    return '';
  }

  return generateXmlTree(
    {
      tagName: 'attachments',
      attributes: { count: attachmentElements.length },
      children: [
        {
          tagName: 'note',
          children: ['Use attachment_read(attachment_id) to access content.'],
        },
        ...attachmentElements,
      ],
    },
    { escapeContent: false }
  );
};
