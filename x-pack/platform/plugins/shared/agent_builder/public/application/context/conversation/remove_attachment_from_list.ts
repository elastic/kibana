/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';

/**
 * Removes an attachment from a list by index.
 * If the target has a groupId, all attachments sharing that groupId are removed together.
 * This supports the bulk-alert pattern where one visible chip represents N hidden siblings.
 */
export const removeAttachmentFromList = (
  attachments: AttachmentInput[],
  index: number
): AttachmentInput[] => {
  const target = attachments[index];
  if (target?.groupId) {
    return attachments.filter((a) => a.groupId !== target.groupId);
  }
  return attachments.filter((_, i) => i !== index);
};
