/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import type {
  AttachmentDeleteTarget,
  RelatedAttachmentIds,
  RelatedAttachmentsDefinition,
} from '../../attachment_framework/types';
import type { CasesClientArgs } from '../types';
import { buildAttachmentTypeFilter } from './type_filter';

/**
 * Returns the ids, by attachment type, that the `relatedAttachments` hooks of the deleted
 * attachment types take along with them.
 */
export const collectRelatedAttachmentIds = async ({
  caseId,
  attachments,
  clientArgs,
}: {
  caseId: string;
  attachments: ReadonlyArray<{ id: string; attributes?: AttachmentAttributesV2 }>;
  clientArgs: CasesClientArgs;
}): Promise<RelatedAttachmentIds[]> => {
  const {
    unifiedAttachmentTypeRegistry,
    services: { caseService },
    request,
  } = clientArgs;

  // An attachment whose stored fields do not decode is still deleted, but it cannot be handed to
  // a hook, so it takes nothing along with it.
  const targetsByType = new Map<
    string,
    { hook: RelatedAttachmentsDefinition; targets: AttachmentDeleteTarget[] }
  >();
  for (const { id, attributes } of attachments) {
    const hook =
      attributes != null && unifiedAttachmentTypeRegistry.has(attributes.type)
        ? unifiedAttachmentTypeRegistry.get(attributes.type).relatedAttachments
        : undefined;

    if (attributes != null && hook != null) {
      const { targets } = targetsByType.get(attributes.type) ?? { targets: [] };
      targetsByType.set(attributes.type, { hook, targets: [...targets, { id, attributes }] });
    }
  }

  if (targetsByType.size === 0) {
    return [];
  }

  const deletedIds = new Set(attachments.map(({ id }) => id));
  const readTypes = new Set([...targetsByType.values()].flatMap(({ hook }) => hook.readTypes));
  const { saved_objects: caseAttachments } = await caseService.getAllCaseComments({
    id: caseId,
    options: { filter: buildAttachmentTypeFilter([...readTypes]) },
  });
  const remainingAttachments = caseAttachments
    .filter(({ id }) => !deletedIds.has(id))
    .map(({ id, attributes }) => ({ id, attributes }));

  const idsByType = new Map<string, Set<string>>();
  for (const { hook, targets } of targetsByType.values()) {
    const related = await hook.get({
      caseId,
      request,
      attachments: targets,
      remainingAttachments,
    });

    for (const { type, attachmentIds } of related) {
      const ids = idsByType.get(type) ?? new Set<string>();
      attachmentIds.forEach((id) => ids.add(id));
      idsByType.set(type, ids);
    }
  }

  return [...idsByType]
    .filter(([, ids]) => ids.size > 0)
    .map(([type, ids]) => ({ type, attachmentIds: [...ids] }));
};
