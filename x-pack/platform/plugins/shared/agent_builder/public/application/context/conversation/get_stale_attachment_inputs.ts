/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type { CheckStaleAttachmentsResponse } from '../../../../common/http_api/attachments';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/**
 * Builds attachment inputs for stale attachments using the conversation's current version data.
 */
export const getStaleAttachmentInputs = (
  staleResponse: CheckStaleAttachmentsResponse,
  versionedAttachments: VersionedAttachment[],
  excludeAttachmentIds: Set<string>
): AttachmentInput[] => {
  const attachmentsById = new Map(
    versionedAttachments.map((attachment) => [attachment.id, attachment])
  );

  return (staleResponse.attachments ?? [])
    .filter(
      (staleAttachment) =>
        staleAttachment.is_stale && !excludeAttachmentIds.has(staleAttachment.attachment_id)
    )
    .flatMap((staleAttachment) => {
      const attachment = attachmentsById.get(staleAttachment.attachment_id);
      const latestVersion = attachment?.versions.find(
        (v) => v.version === attachment.current_version
      );

      if (!attachment || !latestVersion || !isRecord(latestVersion.data)) {
        return [];
      }

      return [
        {
          id: attachment.id,
          type: attachment.type,
          data: latestVersion.data,
          hidden: attachment.hidden ?? false,
        },
      ];
    });
};
