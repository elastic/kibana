/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';

export interface AttachmentContextProvider {
  areTypeInstructionsNeeded(type: string): boolean;
  markTypeInstructionsProvided(type: string): void;
  hasAttachmentContent(key: string): boolean;
  setAttachmentContentKey(key: string, id: string): void;
}

export function makeAttachmentContextProvider(
  attachmentStateManager: AttachmentStateManager
): AttachmentContextProvider {
  const typeInstructionsProvided = new Set<string>();
  const existingByContentKey = new Map<string, string>(); // contentKey -> attachmentId

  const areTypeInstructionsNeeded = (attachmentType: string): boolean =>
    !typeInstructionsProvided.has(attachmentType);
  const markTypeInstructionsProvided = (attachmentType: string) => {
    typeInstructionsProvided.add(attachmentType);
  };
  const hasAttachmentContent = (contentKey: string) => existingByContentKey.has(contentKey);
  const setAttachmentContentKey = (contentKey: string, id: string) => {
    existingByContentKey.set(contentKey, id);
  };

  for (const existing of attachmentStateManager.getAll()) {
    const latest = getLatestVersion(existing);
    if (!latest) continue;
    existingByContentKey.set(`${existing.type}:${latest.content_hash}`, existing.id);
  }

  return {
    areTypeInstructionsNeeded,
    markTypeInstructionsProvided,
    hasAttachmentContent,
    setAttachmentContentKey,
  };
}
