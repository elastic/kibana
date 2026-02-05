/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Attachment, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getLatestVersion, isAttachmentActive } from '@kbn/agent-builder-common/attachments';
import { conversationIndexName } from '../conversation/client/storage';
import { createSpaceDslFilter } from '../../utils/spaces';

export const resolveAttachmentForSpace = async ({
  esClient,
  attachmentId,
  attachmentType,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  attachmentId: string;
  attachmentType: string;
  spaceId: string;
}): Promise<Attachment | undefined> => {
  const response = await esClient.search<{
    attachments?: VersionedAttachment[];
  }>({
    index: conversationIndexName,
    size: 1,
    _source: ['attachments'],
    query: {
      bool: {
        filter: [
          createSpaceDslFilter(spaceId),
          { term: { 'attachments.id': attachmentId } },
          { term: { 'attachments.type': attachmentType } },
        ],
      },
    },
  });

  const hit = response.hits.hits[0]?._source;
  if (!hit?.attachments) {
    return undefined;
  }

  const attachment = hit.attachments.find(
    (candidate) => candidate.id === attachmentId && candidate.type === attachmentType
  );
  if (!attachment || !isAttachmentActive(attachment)) {
    return undefined;
  }

  const latestVersion = getLatestVersion(attachment);
  if (!latestVersion) {
    return undefined;
  }

  return {
    id: attachment.id,
    type: attachment.type,
    data: latestVersion.data as Record<string, unknown>,
  };
};
