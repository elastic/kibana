/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';

/**
 * Drops the inputs that are already in the conversation and carry no data, e.g. a PDF added on
 * paste. Sending them again would only make the server read them again; the message text links to them.
 */
export const withoutPreAddedAttachments = (
  inputs: AttachmentInput[],
  conversationAttachments: readonly VersionedAttachment[] | undefined
): AttachmentInput[] => {
  const storedIds = new Set(conversationAttachments?.map(({ id }) => id));
  return inputs.filter(({ id, data }) => data !== undefined || !id || !storedIds.has(id));
};
