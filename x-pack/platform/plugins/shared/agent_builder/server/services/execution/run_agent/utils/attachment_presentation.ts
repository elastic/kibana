/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { generateXmlTree, type XmlNode } from '@kbn/agent-builder-genai-utils/tools/utils';

/**
 * Formats attachment metadata (id/type/version/estimated tokens/description) as XML.
 * Returns `''` for an empty list.
 */
export const formatAttachmentsMetadata = (attachments: VersionedAttachment[]): string => {
  if (attachments.length === 0) {
    return '';
  }

  const attachmentElements: XmlNode[] = attachments.flatMap((attachment) => {
    const latest = getLatestVersion(attachment);
    if (!latest) {
      return [];
    }

    return [
      {
        tagName: 'attachment',
        attributes: {
          attachment_id: attachment.id,
          type: attachment.type,
          version: latest.version,
          estimated_tokens: latest.estimated_tokens,
          description: attachment.description,
        },
      } satisfies XmlNode,
    ];
  });

  return generateXmlTree(
    {
      tagName: 'conversation-attachments',
      attributes: { count: attachments.length },
      children: attachmentElements,
    },
    { escapeContent: false }
  );
};
