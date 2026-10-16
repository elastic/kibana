/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import type { AttachmentDeleteTarget, AttachmentOnDelete } from '../../attachment_framework/types';
import type { AttachmentSavedObjectType } from '../../services/user_actions/types';
import type { CasesClientArgs } from '../types';

/** A reference to an attachment a hook asked to take along, read for deletion by the caller. */
export interface RelatedAttachmentRef {
  id: string;
  type: AttachmentSavedObjectType;
}

/**
 * Returns references to the case's remaining attachments that the `onDelete` hooks of the deleted
 * attachment types ask to take along.
 */
export const getRelatedAttachmentsToDelete = async ({
  caseId,
  attachments,
  clientArgs,
}: {
  caseId: string;
  attachments: ReadonlyArray<{ id: string; attributes?: AttachmentAttributesV2 }>;
  clientArgs: CasesClientArgs;
}): Promise<RelatedAttachmentRef[]> => {
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
    return [];
  }

  const deletedIds = new Set(attachments.map(({ id }) => id));
  const { saved_objects: caseAttachments } = await caseService.getAllCaseComments({ id: caseId });
  const remainingAttachments = caseAttachments.filter(({ id }) => !deletedIds.has(id));
  const remainingTargets = remainingAttachments.map(({ id, attributes }) => ({ id, attributes }));

  const relatedIds = new Set<string>();
  for (const [onDelete, targets] of targetsByHook) {
    const { relatedAttachmentIds } = await onDelete({
      caseId,
      request,
      attachments: targets,
      remainingAttachments: remainingTargets,
    });
    relatedAttachmentIds.forEach((id) => relatedIds.add(id));
  }

  // A hook can only take attachments that belong to this case. Only the reference is returned:
  // the caller reads them for deletion the same way it read the requested ones, so a taken
  // attachment carries the same file id, owner fallback and decode handling.
  return remainingAttachments
    .filter(({ id }) => relatedIds.has(id))
    .map(({ id, type }) => ({ id, type: type as AttachmentSavedObjectType }));
};
