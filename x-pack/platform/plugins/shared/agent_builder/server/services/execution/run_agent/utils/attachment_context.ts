/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AttachmentVersionRef,
  type VersionedAttachment,
  ATTACHMENT_REF_OPERATION,
  getLatestVersion,
} from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { formatAttachmentsMetadata } from './attachment_presentation';

/**
 * Builds the per-round attachment prompt context: metadata for attachments created
 * this round, and update notices for attachments updated this round. Deliberately
 * excludes per-type instructions — those are computed separately, live, wherever the
 * message is assembled, since type identity and type descriptions are immutable and
 * safe to (re)compute at any time (see prompts/utils/attachments.ts).
 *
 * Call this exactly once per round, at the moment that round's final `attachment_refs`
 * are known — round completion for historical rounds (`add_round_complete_event.ts`),
 * live for the in-flight next input (`to_langchain_messages.ts`). The result for a
 * historical round must then be persisted and never recomputed, since
 * `attachmentStateManager` reflects *current* attachment state — recomputing this
 * later for a past round would leak subsequent edits (e.g. a changed description)
 * back into that round's already-cached message text. See
 * `formatAttachmentsMetadata`'s docs in `./attachment_presentation`.
 *
 * Returns `undefined` when there is nothing to report.
 */
export const buildAttachmentContext = (
  refs: AttachmentVersionRef[],
  attachmentStateManager: AttachmentStateManager
): string | undefined => {
  if (refs.length === 0) {
    return undefined;
  }

  const createdIds = new Set<string>();
  const updatedIds = new Set<string>();

  for (const ref of refs) {
    if (ref.operation === ATTACHMENT_REF_OPERATION.created) {
      createdIds.add(ref.attachment_id);
    } else if (ref.operation === ATTACHMENT_REF_OPERATION.updated) {
      updatedIds.add(ref.attachment_id);
    }
  }
  // An attachment created and updated in the same round is reported as created only.
  for (const id of createdIds) {
    updatedIds.delete(id);
  }

  const resolve = (ids: Set<string>): VersionedAttachment[] =>
    Array.from(ids)
      .map((id) => attachmentStateManager.getAttachmentRecord(id))
      .filter((attachment): attachment is VersionedAttachment => attachment !== undefined);

  const sections: string[] = [];

  const createdXml = formatAttachmentsMetadata(resolve(createdIds));
  if (createdXml) {
    sections.push(`The following attachment(s) were added this turn:\n\n${createdXml}`);
  }

  const updatedXml = formatAttachmentsMetadata(resolve(updatedIds));
  if (updatedXml) {
    sections.push(`The following attachment(s) were updated this turn:\n\n${updatedXml}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined;
};

export interface AttachmentContextProvider {
  areTypeInstructionsNeeded(type: string): boolean;
  markTypeInstructionsProvided(type: string): void;
  existingByContentKey: Map<string, string>;
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
  for (const existing of attachmentStateManager.getAll()) {
    const latest = getLatestVersion(existing);
    if (!latest) continue;
    existingByContentKey.set(`${existing.type}:${latest.content_hash}`, existing.id);
  }

  return {
    areTypeInstructionsNeeded,
    markTypeInstructionsProvided,
    existingByContentKey,
  };
}
