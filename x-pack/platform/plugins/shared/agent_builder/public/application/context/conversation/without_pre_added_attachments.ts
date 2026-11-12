/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttachmentType,
  type AttachmentInput,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

/**
 * Drops the PDFs that are already in the conversation and carry no data (added on paste). Sending
 * them again would only make the server read them again; the message text links to them. Other
 * types are kept, so the server can refresh a by-reference attachment from its origin.
 */
export const withoutPreAddedAttachments = (
  inputs: AttachmentInput[],
  conversationAttachments: readonly VersionedAttachment[] | undefined
): AttachmentInput[] => {
  const storedIds = new Set(conversationAttachments?.map(({ id }) => id));
  return inputs.filter(
    ({ id, type, data }) =>
      type !== AttachmentType.binary || data !== undefined || !id || !storedIds.has(id)
  );
};
