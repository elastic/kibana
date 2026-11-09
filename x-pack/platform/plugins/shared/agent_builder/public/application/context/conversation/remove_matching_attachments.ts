/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';

/** Removes the given attachments from the list: by id when they have one, else by object reference. */
export const removeMatchingAttachments = (
  attachments: ConversationAttachment[],
  toRemove: readonly ConversationAttachment[]
): ConversationAttachment[] => {
  const ids = new Set(toRemove.flatMap(({ id }) => (id ? [id] : [])));
  const references = new Set(toRemove);
  return attachments.filter(
    (attachment) => !references.has(attachment) && !(attachment.id && ids.has(attachment.id))
  );
};
