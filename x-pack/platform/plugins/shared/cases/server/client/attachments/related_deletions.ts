/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentAttributesV2,
  UnifiedAttachmentPayload,
} from '../../../common/types/domain';
import type {
  AttachmentDeleteTarget,
  AttachmentOnDelete,
  AttachmentUpdate,
} from '../../attachment_framework/types';
import type { AttachmentSavedObjectType } from '../../services/user_actions/types';
import type { CasesClientArgs } from '../types';

/** A reference to an attachment a hook asked to take along, read for deletion by the caller. */
export interface RelatedAttachmentRef {
  id: string;
  type: AttachmentSavedObjectType;
}

/** An attachment a hook asked to shrink rather than delete, with the payload replacing its own. */
export interface RelatedAttachmentUpdate extends RelatedAttachmentRef {
  payload: UnifiedAttachmentPayload;
  /**
   * The requested attachments the hook was asked about. A hook answers for all of them at once,
   * so the update is only safe to apply once every one of them is gone.
   */
  requestedIds: string[];
}

export interface RelatedAttachments {
  refs: RelatedAttachmentRef[];
  updates: RelatedAttachmentUpdate[];
}

const EMPTY_RELATED: RelatedAttachments = { refs: [], updates: [] };

/**
 * Returns the attachments of this case that the `onDelete` hooks of the deleted attachment types
 * ask to take along, and those they ask to shrink instead.
 *
 * The hooks run whether or not the caller accepts the deletions. `includeRelated: false` drops
 * the deletions from the result and keeps the updates: a hook whose attachment is leaving still
 * has to correct the bookkeeping the surviving attachments keep about it, and that bookkeeping
 * is not something the caller declined.
 */
export const getRelatedAttachmentsToDelete = async ({
  caseId,
  attachments,
  includeRelated,
  clientArgs,
}: {
  caseId: string;
  attachments: ReadonlyArray<{ id: string; attributes?: AttachmentAttributesV2 }>;
  includeRelated: boolean;
  clientArgs: CasesClientArgs;
}): Promise<RelatedAttachments> => {
  const {
    unifiedAttachmentTypeRegistry,
    services: { caseService },
    request,
  } = clientArgs;

  // An attachment whose stored fields do not decode is still deleted, but it cannot be handed to
  // a hook, so it takes nothing along with it.
  const decodableAttachments = attachments.flatMap(({ id, attributes }) =>
    attributes != null ? [{ id, attributes }] : []
  );

  const targetsByHook = new Map<AttachmentOnDelete, AttachmentDeleteTarget[]>();
  for (const { id, attributes } of decodableAttachments) {
    const onDelete = unifiedAttachmentTypeRegistry.has(attributes.type)
      ? unifiedAttachmentTypeRegistry.get(attributes.type).onDelete
      : undefined;

    if (onDelete != null) {
      targetsByHook.set(onDelete, [...(targetsByHook.get(onDelete) ?? []), { id, attributes }]);
    }
  }

  if (targetsByHook.size === 0) {
    return EMPTY_RELATED;
  }

  const deletedIds = new Set(attachments.map(({ id }) => id));
  const { saved_objects: caseAttachments } = await caseService.getAllCaseComments({ id: caseId });
  const remainingAttachments = caseAttachments.filter(({ id }) => !deletedIds.has(id));
  const remainingTargets = remainingAttachments.map(({ id, attributes }) => ({ id, attributes }));

  const relatedIds = new Set<string>();
  const updatesById = new Map<string, { update: AttachmentUpdate; requestedIds: string[] }>();
  for (const [onDelete, targets] of targetsByHook) {
    const requestedIds = targets.map(({ id }) => id);
    const { relatedAttachmentIds, relatedAttachmentUpdates = [] } = await onDelete({
      caseId,
      request,
      attachments: targets,
      remainingAttachments: remainingTargets,
      includeRelated,
    });
    // The caller refused the deletions, so they are dropped here rather than trusted to the hook.
    if (includeRelated) {
      relatedAttachmentIds.forEach((id) => relatedIds.add(id));
    }
    // Two hooks shrinking the same attachment would each have written over the other's result, so
    // the last one wins either way; keeping one update per id at least makes that a single write.
    relatedAttachmentUpdates.forEach((update) =>
      updatesById.set(update.id, { update, requestedIds })
    );
  }

  // A hook can only take or shrink attachments that belong to this case. Only the reference is
  // returned: the caller reads them for deletion the same way it read the requested ones, so a
  // taken attachment carries the same file id, owner fallback and decode handling.
  const refs = remainingAttachments
    .filter(({ id }) => relatedIds.has(id))
    .map(({ id, type }) => ({ id, type: type as AttachmentSavedObjectType }));

  const updates = remainingAttachments.flatMap(({ id, type, attributes }) => {
    const entry = updatesById.get(id);

    // Deleting the attachment makes shrinking it pointless, and a hook may not use an update to
    // change what an attachment is or who owns it.
    const isApplicable =
      entry != null && !relatedIds.has(id) && entry.update.payload.type === attributes.type;

    return isApplicable
      ? [
          {
            id,
            type: type as AttachmentSavedObjectType,
            payload: { ...entry.update.payload, owner: attributes.owner },
            requestedIds: entry.requestedIds,
          },
        ]
      : [];
  });

  return { refs, updates };
};
