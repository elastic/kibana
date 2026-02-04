/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SmlAttachmentListItem } from '@kbn/agent-builder-server/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { chatSystemIndex } from '@kbn/agent-builder-server';

export const listConversationAttachmentsForType = async ({
  esClient,
  attachmentType,
}: {
  esClient: ElasticsearchClient;
  attachmentType: string;
}): Promise<SmlAttachmentListItem[]> => {
  const results = new Map<string, SmlAttachmentListItem>();
  let searchAfter: unknown[] | undefined;

  while (true) {
    const response = await esClient.search<{
      attachments?: VersionedAttachment[];
      space?: string;
    }>({
      index: chatSystemIndex('conversations'),
      size: 1000,
      _source: ['attachments', 'space'],
      sort: [{ _id: 'asc' }],
      search_after: searchAfter,
      query: {
        bool: {
          filter: [{ term: { 'attachments.type': attachmentType } }],
        },
      },
    });

    const hits = response.hits.hits;
    if (hits.length === 0) {
      break;
    }

    for (const hit of hits) {
      const attachments = hit._source?.attachments ?? [];
      const spaceId = hit._source?.space;

      for (const attachment of attachments) {
        if (attachment.type !== attachmentType) {
          continue;
        }

        const latest = getLatestVersion(attachment);
        const updatedAt = latest?.created_at ?? new Date().toISOString();
        const id = `${attachment.id}:${spaceId ?? 'default'}`;

        const existing = results.get(id);
        if (!existing || existing.updatedAt < updatedAt) {
          results.set(id, {
            attachmentId: attachment.id,
            attachmentType,
            updatedAt,
            createdAt: attachment.versions[0]?.created_at,
            spaceId,
          });
        }
      }
    }

    searchAfter = hits[hits.length - 1].sort;
  }

  return [...results.values()];
};
