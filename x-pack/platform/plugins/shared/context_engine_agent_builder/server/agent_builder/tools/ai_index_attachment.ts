/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../common/agent_builder_attachments';

/**
 * Which AI index a tool call is about.
 *
 * Every Context Engine tool takes the id as an optional parameter and otherwise reads it from the
 * conversation's `ai_index` attachment, so the model does not have to repeat back an id it was
 * already given — and cannot quietly act on a different index than the one in front of the user.
 */

export const flattenAiIndexAttachments = (
  attachments: AttachmentStateManager
): Array<{ type: string; data: { id?: string } }> =>
  attachments.getAll().flatMap((attachment) => {
    const latestVersion = getLatestVersion(attachment);
    if (!latestVersion?.data || typeof latestVersion.data !== 'object') {
      return [];
    }
    return [{ type: attachment.type, data: latestVersion.data as { id?: string } }];
  });

export const resolveAiIndexIdFromAttachments = (
  attachments: Array<{ type: string; data: { id?: string } }>,
  aiIndexId?: string
): string => {
  if (aiIndexId) {
    return aiIndexId;
  }

  const attachment = attachments.find(
    (entry) => entry.type === AI_INDEX_ATTACHMENT_TYPE && typeof entry.data.id === 'string'
  );

  if (!attachment?.data.id) {
    throw new Error(
      'No ai_index attachment found in this conversation. Provide aiIndexId explicitly or attach the AI index first.'
    );
  }

  return attachment.data.id;
};
