/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';

import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import type {
  UnifiedAttachmentAttributes,
  UnifiedReferenceAttachmentPayload,
} from '../../../common/types/domain';
import {
  BulkDeleteAttachmentsByAttachmentIdRequestRt,
  BulkDeleteAttachmentsBySavedObjectIdRequestRt,
  BulkDeleteFileAttachmentsRequestRt,
} from '../../../common/types/api';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import {
  getIndexFromMetadata,
  isUnifiedReferenceAttachmentRequest,
  resolveUnifiedAttachmentType,
} from '../../../common/utils/attachments';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { getAlertInfoFromComments, getIDsAndIndicesAsArrays } from '../../common/utils';
import type { SOWithErrors } from '../../common/types';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import type { CasesClientArgs } from '../types';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../utils';
import { createCaseError, generateCaseErrorResponse, isSOError } from '../../common/error';
import { Operations } from '../../authorization';
import type { BulkDeleteArgs, BulkDeleteFileArgs } from './types';
import type { CasesClient } from '../client';
import { deleteFiles, getFileEntitiesForCase } from '../files';
import type { DecodedAttachment, RecordUserActions } from './delete_utils';
import {
  deleteCaseAttachments,
  doNotExistOnCaseMessage,
  updateCaseAttachmentStats,
} from './delete_utils';
import { buildAttachmentTypeFilter } from './type_filter';
import { emitAttachmentsDeletedEvent } from './trigger_utils';
import { collectRelatedAttachmentIds } from './related_deletions';

/**
 * Deletes attachments from a case, by saved object id or by the ids an attachment type references,
 * and records one `bulkAttachments` user action per attachment type. Rejects the request if any id
 * is not found.
 */
export const bulkDeleteAttachments = async (
  args: BulkDeleteArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const { caseId, includeRelated = true } = args;
  const { logger } = clientArgs;

  try {
    if ('savedObjectIds' in args) {
      const request = decodeWithExcessOrThrow(BulkDeleteAttachmentsBySavedObjectIdRequestRt)({
        ids: args.savedObjectIds,
      });
      await deleteBySavedObjectIds(
        { caseId, savedObjectIds: request.ids, includeRelated },
        clientArgs
      );
    } else {
      const request = decodeWithExcessOrThrow(BulkDeleteAttachmentsByAttachmentIdRequestRt)({
        type: args.type,
        attachmentIds: args.attachmentIds,
      });
      await deleteByAttachmentIds({ caseId, ...request, includeRelated }, clientArgs);
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk delete attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Removes the ids that the `getRelatedAttachments` hooks of the attachments' types take along
 * with them, recording 1 user action per related type.
 */
export const deleteRelatedAttachments = async (
  { caseId, attachments }: { caseId: string; attachments: DecodedAttachment[] },
  clientArgs: CasesClientArgs
): Promise<void> => {
  const related = await collectRelatedAttachmentIds({ caseId, attachments, clientArgs });

  for (const { type, attachmentIds } of related) {
    await deleteByAttachmentIds({ caseId, type, attachmentIds, includeRelated: false }, clientArgs);
  }
};

const deleteBySavedObjectIds = async (
  {
    caseId,
    savedObjectIds,
    includeRelated,
  }: { caseId: string; savedObjectIds: string[]; includeRelated: boolean },
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { attachmentService },
  } = clientArgs;

  const uniqueIds = [...new Set(savedObjectIds)];
  const attachments = await attachmentService.getter.bulkGetForDeletion(uniqueIds);
  const foundIds = new Set(attachments.map(({ id }) => id));
  const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

  if (missingIds.length > 0) {
    throw Boom.notFound(doNotExistOnCaseMessage(missingIds, caseId));
  }

  await deleteCaseAttachments(
    {
      caseId,
      attachments,
      operation: Operations.deleteComment,
      recordUserActions: recordByType(caseId, clientArgs),
      beforeDelete: includeRelated
        ? (decoded) => deleteRelatedAttachments({ caseId, attachments: decoded }, clientArgs)
        : undefined,
    },
    clientArgs
  );
};

type ReferenceAttributes = UnifiedAttachmentAttributes & UnifiedReferenceAttachmentPayload;

interface OwnedReferenceAttachment extends AttachmentForDeletion {
  owner: string;
  attributes: ReferenceAttributes;
}

interface PartialDeletion {
  attachment: OwnedReferenceAttachment;
  removedIds: string[];
  remainingIds: string[];
  remainingIndex?: string | string[];
}

const notAttachedMessage = (type: string, ids: string[], caseId: string): string =>
  `${type} ${ids.join(', ')} ${ids.length === 1 ? 'is' : 'are'} not attached to case ${caseId}.`;

/**
 * Removes the ids an attachment type references from the case, deleting the attachments left
 * without any and shrinking the others.
 */
export const deleteByAttachmentIds = async (
  {
    caseId,
    type,
    attachmentIds,
    includeRelated,
  }: { caseId: string; type: string; attachmentIds: string[]; includeRelated: boolean },
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    user,
    logger,
    authorization,
    services: { attachmentService, caseService, alertsService },
  } = clientArgs;

  const originalCase = await caseService.getCase({ id: caseId });
  const caseOwner = originalCase.attributes.owner;

  // Authorized before the not attached check below, so its message cannot tell an unauthorized
  // caller which ids are attached to the case.
  await authorization.ensureAuthorized({
    entities: [{ id: caseId, owner: caseOwner }],
    operation: Operations.deleteComment,
  });

  if (type === FILE_ATTACHMENT_TYPE) {
    await deleteCaseFiles(
      {
        caseId,
        fileIds: attachmentIds,
        notFoundMessage: (ids) => notAttachedMessage(type, ids, caseId),
        recordUserActions: recordByType(caseId, clientArgs),
      },
      clientArgs
    );
    return;
  }

  const requestedIds = new Set(attachmentIds);
  const candidates = await attachmentService.getter.getCaseAttachmentsForDeletion({
    caseId,
    filter: combineFilters([
      buildAttachmentTypeFilter([type]),
      buildReferencedIdsFilter(attachmentIds),
    ]),
  });

  const toDelete: OwnedReferenceAttachment[] = [];
  const toUpdate: PartialDeletion[] = [];
  const matchedIds = new Set<string>();

  const referenceAttachments = candidates
    .map((candidate) => toOwnedReferenceAttachment(candidate, caseOwner))
    .filter((attachment): attachment is OwnedReferenceAttachment => attachment != null);

  for (const attachment of referenceAttachments) {
    const ids = toArray(attachment.attributes.attachmentId);
    const matched = ids.filter((id) => requestedIds.has(id));
    matched.forEach((id) => matchedIds.add(id));

    if (matched.length > 0 && matched.length === ids.length) {
      toDelete.push(attachment);
    } else if (matched.length > 0) {
      toUpdate.push(splitReferenceIds(attachment, requestedIds));
    }
  }

  const missingIds = attachmentIds.filter((id) => !matchedIds.has(id));
  if (missingIds.length > 0) {
    throw Boom.notFound(notAttachedMessage(type, missingIds, caseId));
  }

  if (toUpdate.length > 0) {
    await authorization.ensureAuthorized({
      entities: toUpdate.map(({ attachment: { id, owner } }) => ({ id, owner })),
      operation: Operations.deleteComment,
    });
  }

  const deletedIds = new Set<string>();
  let updated: PartialDeletion[] = [];
  let failed: Array<SOWithErrors<unknown>> = [];

  // Deleted and updated attachments are recorded as 1 change, also when a later step fails, so the
  // case and its activity match what changed.
  const recordChanges = async () => {
    const deleted = toDelete.filter(({ id }) => deletedIds.has(id));
    if (deleted.length === 0 && updated.length === 0) {
      return;
    }

    const removedFromUpdated = updated.map(toRemovedAttributes);
    const removedAttributes = [
      ...deleted.map(({ attributes }) => attributes),
      ...removedFromUpdated,
    ];

    await updateCaseAttachmentStats({ caseService, attachmentService, caseId, user });

    // Updated attachments still exist, so only the deleted ones get a deletion audit event.
    await recordDeletions(
      {
        caseId,
        owner: caseOwner,
        byType: new Map([
          [
            type,
            {
              items: new Set(
                removedAttributes.flatMap(({ attachmentId }) => toArray(attachmentId))
              ),
              attachments: deleted.map(({ id, type: savedObjectType }) => ({
                id,
                savedObjectType,
              })),
            },
          ],
        ]),
      },
      clientArgs
    );

    // The deleted attachments' alerts are unlinked by the shared deletion.
    const alerts = getAlertInfoFromComments(removedFromUpdated);
    if (alerts.length > 0) {
      await alertsService.removeCaseIdFromAlerts({ alerts, caseId });
    }

    emitAttachmentsDeletedEvent(clientArgs, {
      caseId,
      owner: caseOwner,
      attachmentType: type,
      attachmentIds: deleted.map(({ id }) => id),
      removedAttributes,
    });
  };

  try {
    if (toDelete.length > 0) {
      await deleteCaseAttachments(
        {
          caseId,
          attachments: toDelete,
          operation: Operations.deleteComment,
          onDeleted: (ids) => ids.forEach((id) => deletedIds.add(id)),
          beforeDelete: includeRelated
            ? (decoded) => deleteRelatedAttachments({ caseId, attachments: decoded }, clientArgs)
            : undefined,
        },
        clientArgs
      );
    }

    ({ updated, failed } = await removeReferencedIds({ partialDeletions: toUpdate }, clientArgs));
  } catch (error) {
    await recordChanges().catch((recordError) =>
      logger.error(`Failed to record the partial removal on case ${caseId}: ${recordError}`)
    );
    throw error;
  }

  await recordChanges();

  if (failed.length > 0) {
    const message = `Failed to remove ${type} ids from ${
      failed.length === 1 ? 'attachment' : 'attachments'
    } ${failed.map(({ id }) => id).join(', ')} on case ${caseId}.`;
    const isConflict = failed.every(({ error }) => generateCaseErrorResponse(error).status === 409);

    throw isConflict ? Boom.conflict(message) : Boom.internal(message);
  }
};

/**
 * Removes the requested ids from attachments that reference other ids too. An attachment that
 * changed since it was read is not updated.
 */
const removeReferencedIds = async (
  { partialDeletions }: { partialDeletions: PartialDeletion[] },
  clientArgs: CasesClientArgs
): Promise<{ updated: PartialDeletion[]; failed: Array<SOWithErrors<unknown>> }> => {
  if (partialDeletions.length === 0) {
    return { updated: [], failed: [] };
  }

  const {
    user,
    services: { attachmentService },
  } = clientArgs;

  const updatedAt = new Date().toISOString();
  const { saved_objects: savedObjects } = await attachmentService.bulkUpdate({
    comments: partialDeletions.map(({ attachment, remainingIds, remainingIndex }) => ({
      savedObjectId: attachment.id,
      updatedAttributes: {
        ...attachment.attributes,
        attachmentId: remainingIds,
        metadata: withIndex(attachment.attributes.metadata, remainingIndex),
        updated_at: updatedAt,
        updated_by: user,
      },
      options: { version: attachment.version },
    })),
    refresh: true,
  });

  const failed = savedObjects.filter((savedObject) => isSOError(savedObject));
  const failedIds = new Set(failed.map(({ id }) => id));
  const updated = partialDeletions.filter(({ attachment }) => !failedIds.has(attachment.id));

  return { updated, failed };
};

/** The fields of the ids removed from an attachment that keeps its other ids. */
const toRemovedAttributes = ({
  attachment: { attributes },
  removedIds,
}: PartialDeletion): ReferenceAttributes => ({
  ...attributes,
  attachmentId: removedIds,
  metadata: withIndex(attributes.metadata, pickIndexFor(attributes, removedIds)),
});

/** Matches attachments that reference any of the ids, in either storage model. */
const buildReferencedIdsFilter = (ids: string[]): KueryNode | undefined =>
  combineFilters(
    [
      buildFilter({
        filters: ids,
        field: 'attachmentId',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      }),
      buildFilter({
        filters: ids,
        field: 'alertId',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
      buildFilter({
        filters: ids,
        field: 'eventId',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
    ],
    NodeBuilderOperators.or
  );

const recordByType =
  (caseId: string, clientArgs: CasesClientArgs): RecordUserActions =>
  async ({ attachments }) => {
    const [firstAttachment] = attachments;
    if (firstAttachment == null) {
      return;
    }

    await recordDeletions(
      { caseId, owner: firstAttachment.owner, byType: groupByType(attachments) },
      clientArgs
    );
  };

interface TypeDeletion {
  /** The referenced ids (alert, file, dashboard, ...), or the attachment id when it has none. */
  items: Set<string>;
  /** The deleted attachments, audited one by one. */
  attachments: Array<{ id: string; savedObjectType: string }>;
}

const recordDeletions = async (
  { caseId, owner, byType }: { caseId: string; owner: string; byType: Map<string, TypeDeletion> },
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    user,
    services: { userActionService },
  } = clientArgs;

  await userActionService.creator.bulkCreateAttachmentBulkDeletion({
    caseId,
    owner,
    deletions: [...byType].map(([attachmentType, deletion]) => ({
      attachmentType,
      count: deletion.items.size,
      attachments: deletion.attachments,
    })),
    user,
  });
};

const groupByType = (attachments: DecodedAttachment[]): Map<string, TypeDeletion> =>
  attachments.reduce(
    (byType, { id, type: savedObjectType, attributes, owner, requestAttributes }) => {
      const type = resolveUnifiedAttachmentType(attributes, owner);
      const { ids: referencedIds } = getIDsAndIndicesAsArrays(requestAttributes);
      const deletion = byType.get(type) ?? { items: new Set<string>(), attachments: [] };
      (referencedIds.length > 0 ? referencedIds : [id]).forEach((item) => deletion.items.add(item));
      deletion.attachments.push({ id, savedObjectType });
      byType.set(type, deletion);
      return byType;
    },
    new Map<string, TypeDeletion>()
  );

const toOwnedReferenceAttachment = (
  attachment: AttachmentForDeletion,
  caseOwner: string
): OwnedReferenceAttachment | undefined => {
  const { attributes } = attachment;
  if (attributes == null || !isUnifiedReferenceAttachmentRequest(attributes)) {
    return;
  }

  return {
    ...attachment,
    owner: attachment.owner ?? caseOwner,
    attributes,
  };
};

const splitReferenceIds = (
  attachment: OwnedReferenceAttachment,
  requestedIds: Set<string>
): PartialDeletion => {
  const ids = toArray(attachment.attributes.attachmentId);
  const removed = ids.filter((id) => requestedIds.has(id));
  const remaining = ids.filter((id) => !requestedIds.has(id));

  return {
    attachment,
    removedIds: removed,
    remainingIds: remaining,
    remainingIndex: pickIndexFor(attachment.attributes, remaining),
  };
};

/** A scalar index applies to every id; an array index is aligned 1-to-1 with the ids. */
const pickIndexFor = (
  attributes: ReferenceAttributes,
  keptIds: string[]
): string | string[] | undefined => {
  const index = getIndexFromMetadata(attributes.metadata);
  if (index == null || typeof index === 'string') {
    return index;
  }

  const ids = toArray(attributes.attachmentId);
  if (index.length !== ids.length) {
    return index;
  }

  const kept = new Set(keptIds);
  return index.filter((_, position) => kept.has(ids[position]));
};

const withIndex = (
  metadata: ReferenceAttributes['metadata'],
  index: string | string[] | undefined
): ReferenceAttributes['metadata'] =>
  metadata == null || index == null ? metadata : { ...metadata, index };

const toArray = (value: string | string[]): string[] => (Array.isArray(value) ? value : [value]);

/** Deletes files of a case and the attachments that reference them. */
export const bulkDeleteFileAttachments = async (
  { caseId, fileIds }: BulkDeleteFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<void> => {
  const { logger } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkDeleteFileAttachmentsRequestRt)({ ids: fileIds });

    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    await deleteCaseFiles({ caseId, fileIds: request.ids }, clientArgs);
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

interface DeleteCaseFilesArgs {
  caseId: string;
  fileIds: string[];
  /** When set, rejects ids that are neither a file of the case nor attached to it. */
  notFoundMessage?: (ids: string[]) => string;
  recordUserActions?: RecordUserActions;
}

/** Deletes files of a case and their attachments, including a file whose attachment was never created. */
const deleteCaseFiles = async (
  { caseId, fileIds, notFoundMessage, recordUserActions }: DeleteCaseFilesArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { attachmentService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  // Rejects a file linked to another case before anything is deleted.
  const fileEntities = await getFileEntitiesForCase({
    caseId,
    fileIds,
    fileService,
    logger,
  });

  const attachments = await attachmentService.getter.getFileAttachmentsForDeletion({
    caseId,
    fileIds,
  });

  if (notFoundMessage != null) {
    const foundIds = new Set([
      ...fileEntities.map(({ id }) => id),
      ...attachments.flatMap(({ fileId }) => (fileId != null ? [fileId] : [])),
    ]);
    const missingIds = fileIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw Boom.notFound(notFoundMessage(missingIds));
    }
  }

  // A file has no attachment when creating the attachment failed after the upload.
  const attachedFileIds = new Set(attachments.map(({ fileId }) => fileId));
  const unattachedFileEntities = fileEntities.filter(({ id }) => !attachedFileIds.has(id));

  if (unattachedFileEntities.length > 0) {
    await authorization.ensureAuthorized({
      entities: unattachedFileEntities,
      operation: Operations.deleteComment,
    });
  }

  if (attachments.length > 0) {
    await deleteCaseAttachments(
      { caseId, attachments, operation: Operations.deleteComment, recordUserActions },
      clientArgs
    );
  }

  await deleteFiles(
    unattachedFileEntities.map(({ id }) => id),
    fileService
  );
};
