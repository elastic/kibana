/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import type { AttachmentDeleteTarget, AttachmentOnDelete } from '../../attachment_framework/types';
import type { CasesClientArgs } from '../types';

/**
 * Returns the case's remaining attachments that the `onDelete` hooks of the deleted attachment
 * types ask to take along.
 */
export const getRelatedAttachmentsToDelete = async ({
  caseId,
  attachments,
  clientArgs,
}: {
  caseId: string;
  attachments: ReadonlyArray<SavedObject<AttachmentAttributesV2>>;
  clientArgs: CasesClientArgs;
}): Promise<Array<SavedObject<AttachmentAttributesV2>>> => {
  const {
    unifiedAttachmentTypeRegistry,
    services: { caseService },
    request,
  } = clientArgs;

  const targetsByHook = new Map<AttachmentOnDelete, AttachmentDeleteTarget[]>();
  for (const { id, attributes } of attachments) {
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

  // A hook can only take attachments that belong to this case.
  return remainingAttachments.filter(({ id }) => relatedIds.has(id));
};
