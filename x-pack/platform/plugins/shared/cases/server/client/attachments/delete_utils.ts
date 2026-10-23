/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KueryNode } from '@kbn/es-query';

import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type {
  AttachmentAttributesV2,
  UnifiedAttachmentAttributes,
  UnifiedReferenceAttachmentPayload,
} from '../../../common/types/domain';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { AttachmentRequestRtV2 } from '../../../common/types/api';
import {
  getIndexFromMetadata,
  isUnifiedReferenceAttachmentRequest,
  resolveUnifiedAttachmentType,
} from '../../../common/utils/attachments';
import { decodeOrThrow } from '../../common/runtime_types';
import { getAlertInfoFromComments, getIDsAndIndicesAsArrays } from '../../common/utils';
import { getCaseReferenceId } from '../../common/references';
import type { SOWithErrors } from '../../common/types';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import { generateCaseErrorResponse, isSOError } from '../../common/error';
import type { OperationDetails } from '../../authorization';
import { Operations } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import type { CasesClientArgs } from '../types';
import { buildFilter, combineFilters, NodeBuilderOperators } from '../utils';
import { deleteFiles, getFileEntitiesForCase } from '../files';
import { buildAttachmentTypeFilter } from './type_filter';
import { emitAttachmentsDeletedEvent, emitAttachmentsDeletedEvents } from './trigger_utils';
import { collectRelatedAttachmentIds } from './related_deletions';

interface OwnedAttachment extends AttachmentForDeletion {
  owner: string;
}

export interface DecodedAttachment extends OwnedAttachment {
  attributes: AttachmentAttributesV2;
  /** The attachment fields recorded in the deletion user action. */
  requestAttributes: AttachmentRequestV2;
}

/** Records the deletion in place of the default user action per attachment. */
export type RecordUserActions = (args: { attachments: DecodedAttachment[] }) => Promise<void>;

export const doNotExistOnCaseMessage = (ids: string[], caseId: string): string =>
  ids.length === 1
    ? `Attachment ${ids[0]} does not exist on case ${caseId}.`
    : `Attachments ${ids.join(', ')} do not exist on case ${caseId}.`;

interface DeleteCaseAttachmentsArgs {
  caseId: string;
  attachments: AttachmentForDeletion[];
  operation: OperationDetails;
  /** Message of the not found error thrown for attachments of another case. */
  notInCaseMessage?: (ids: string[]) => string;
  recordUserActions?: RecordUserActions;
  /**
   * Receives the ids the bulk delete confirmed. When set, the caller updates the case totals,
   * records the user actions and emits the event, so several steps count as 1 change.
   */
  onDeleted?: (deletedIds: ReadonlySet<string>) => void;
  /**
   * Runs once the attachments are authorized and known to be on the case, before any of them is
   * deleted.
   */
  beforeDelete?: (attachments: DecodedAttachment[]) => Promise<void>;
}

/** Deletes attachments read for deletion and their files; shared by the comment delete routes. */
export const deleteCaseAttachments = async (
  {
    caseId,
    attachments,
    operation,
    notInCaseMessage = (ids) => doNotExistOnCaseMessage(ids, caseId),
    recordUserActions,
    onDeleted,
    beforeDelete,
  }: DeleteCaseAttachmentsArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  let caseRead: Promise<CaseSavedObjectTransformed> | undefined;
  const getCase = (): Promise<CaseSavedObjectTransformed> => {
    caseRead ??= caseService.getCase({ id: caseId });
    return caseRead;
  };

  const ownedAttachments = await withCaseOwnerFallback({ attachments, getCase });

  // Authorized before the case and file checks below, so their error messages cannot tell an
  // unauthorized caller which case an attachment belongs to, or what type it is.
  await authorization.ensureAuthorized({
    entities: ownedAttachments.map(({ id, owner }) => ({ id, owner })),
    operation,
  });

  const notInCaseIds = ownedAttachments
    .filter(({ references }) => getCaseReferenceId(references) !== caseId)
    .map(({ id }) => id);

  if (notInCaseIds.length > 0) {
    throw Boom.notFound(notInCaseMessage(notInCaseIds));
  }

  // A row that fails to decode is still deleted, but gets no user action, alert update or event.
  const decodedAttachments = ownedAttachments.flatMap((attachment) =>
    toDecodedAttachment(attachment, logger)
  );

  // Files are read from the stored fields, so a row that fails to decode still deletes its file.
  // A file linked to another case or with invalid metadata is kept.
  const fileEntities = await getFileEntitiesForCase({
    caseId,
    fileIds: [
      ...new Set(ownedAttachments.flatMap(({ fileId }) => (fileId != null ? [fileId] : []))),
    ],
    fileService,
    logger,
    skipInvalid: true,
  });

  if (fileEntities.length > 0) {
    await authorization.ensureAuthorized({ entities: fileEntities, operation });
  }

  // Several attachments can reference the same file, including ones outside this request.
  const fileReferences =
    fileEntities.length > 0
      ? await attachmentService.getter.getFileAttachmentsForDeletion({
          caseId,
          fileIds: fileEntities.map(({ id }) => id),
        })
      : [];

  // Read before deleting, so a missing case fails the request with nothing deleted.
  await getCase();

  await beforeDelete?.(decodedAttachments);

  const savedObjectIds = ownedAttachments.map(({ id }) => id);
  const deletedIds = new Set(await attachmentService.bulkDelete({ savedObjectIds, refresh: true }));
  onDeleted?.(deletedIds);

  // Core's bulk delete reports per-object failures instead of throwing. The confirmed deletes are
  // still recorded before throwing, since a retry fails the not found check on those ids.
  const notDeletedIds = savedObjectIds.filter((id) => !deletedIds.has(id));

  if (deletedIds.size > 0) {
    // A file is kept while any attachment that was not deleted still references it.
    const keptFileIds = new Set(
      [...ownedAttachments, ...fileReferences].flatMap(({ id, fileId }) =>
        !deletedIds.has(id) && fileId != null ? [fileId] : []
      )
    );

    await recordDeletion(
      {
        caseId,
        attachments: decodedAttachments.filter(({ id }) => deletedIds.has(id)),
        fileIds: fileEntities.filter(({ id }) => !keptFileIds.has(id)).map(({ id }) => id),
        recordUserActions,
        deferCaseUpdates: onDeleted != null,
      },
      clientArgs
    );
  }

  if (notDeletedIds.length > 0) {
    throw Boom.internal(
      `Failed to delete ${
        notDeletedIds.length === 1 ? 'attachment' : 'attachments'
      } ${notDeletedIds.join(', ')} on case ${caseId}.`
    );
  }
};

interface RecordDeletionArgs {
  caseId: string;
  attachments: DecodedAttachment[];
  fileIds: string[];
  recordUserActions?: RecordUserActions;
  deferCaseUpdates: boolean;
}

const recordDeletion = async (
  { caseId, attachments, fileIds, recordUserActions, deferCaseUpdates }: RecordDeletionArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    user,
    services: { caseService, attachmentService, userActionService, alertsService },
    logger,
    fileService,
  } = clientArgs;

  // After the saved objects, so a failure leaves an unreferenced file rather than an attachment
  // pointing at a missing one.
  try {
    await deleteFiles(fileIds, fileService);
  } catch (error) {
    logger.warn(
      `Failed to delete the files of the attachments deleted on case ${caseId}: ${error}`
    );
  }

  if (!deferCaseUpdates) {
    // Recomputed from the index rather than decremented, so the stats are right for any subset.
    await updateCaseAttachmentStats({
      caseService,
      attachmentService,
      caseId,
      user,
    });

    if (recordUserActions != null) {
      await recordUserActions({ attachments });
    } else if (attachments.length > 0) {
      await userActionService.creator.bulkCreateAttachmentDeletion({
        caseId,
        attachments: attachments.map(({ id, owner, type, requestAttributes }) => ({
          id,
          owner,
          attachment: requestAttributes,
          savedObjectType: type,
        })),
        user,
      });
    }
  }

  await handleAlerts({
    alertsService,
    attachments: attachments.map(({ attributes }) => attributes),
    caseId,
  });

  if (!deferCaseUpdates) {
    emitAttachmentsDeletedEvents(clientArgs, caseId, attachments);
  }
};

const hasOwner = (attachment: AttachmentForDeletion): attachment is OwnedAttachment =>
  attachment.owner != null;

/**
 * An attachment always shares its case's owner, so a row whose stored owner is unreadable is
 * authorized on the case owner instead.
 */
const withCaseOwnerFallback = async ({
  attachments,
  getCase,
}: {
  attachments: AttachmentForDeletion[];
  getCase: () => Promise<CaseSavedObjectTransformed>;
}): Promise<OwnedAttachment[]> => {
  if (attachments.every(hasOwner)) {
    return attachments;
  }

  const {
    attributes: { owner: caseOwner },
  } = await getCase();

  return attachments.map((attachment) => ({ ...attachment, owner: attachment.owner ?? caseOwner }));
};

const toDecodedAttachment = (
  attachment: OwnedAttachment,
  logger: CasesClientArgs['logger']
): DecodedAttachment[] => {
  const { attributes: storedAttributes, owner } = attachment;

  if (storedAttributes == null) {
    return [];
  }

  // The resolved owner, so the user action and event agree with the authorized owner.
  const attributes = { ...storedAttributes, owner };

  // Strips the fields not part of the original request (created_at etc.); the stored fields vary
  // by attachment type.
  try {
    return [
      {
        ...attachment,
        attributes,
        requestAttributes: decodeOrThrow(AttachmentRequestRtV2)(attributes),
      },
    ];
  } catch (error) {
    logger.warn(`Attachment ${attachment.id} is deleted without a user action: ${error}`);
    return [];
  }
};

interface HandleAlertsArgs {
  alertsService: CasesClientArgs['services']['alertsService'];
  attachments: AttachmentRequestV2[];
  caseId: string;
}

const handleAlerts = async ({ alertsService, attachments, caseId }: HandleAlertsArgs) => {
  const alerts = getAlertInfoFromComments(attachments);

  if (alerts.length === 0) {
    return;
  }

  await alertsService.removeCaseIdFromAlerts({ alerts, caseId });
};

interface UpdateCaseAttachmentStats {
  caseService: CasesClientArgs['services']['caseService'];
  attachmentService: CasesClientArgs['services']['attachmentService'];
  caseId: string;
  user: CasesClientArgs['user'];
}

export const updateCaseAttachmentStats = async ({
  caseService,
  attachmentService,
  caseId,
  user,
}: UpdateCaseAttachmentStats) => {
  // Read right before the patch, which writes the case references back without a version check.
  const originalCase = await caseService.getCase({ id: caseId });
  const date = new Date().toISOString();

  const attachmentStats = await attachmentService.getter.getCaseAttatchmentStats({
    caseIds: [caseId],
  });

  const totalComments = attachmentStats.get(caseId)?.userComments ?? 0;
  const totalAlerts = attachmentStats.get(caseId)?.alerts ?? 0;
  const totalEvents = attachmentStats.get(caseId)?.events ?? 0;

  await caseService.patchCase({
    originalCase,
    caseId,
    updatedAttributes: {
      updated_at: date,
      updated_by: user,
      total_comments: totalComments,
      total_alerts: totalAlerts,
      total_events: totalEvents,
    },
    refresh: false,
  });
};

/**
 * Removes the ids that the `relatedAttachments` hooks of the attachments' types take along
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
      ids: deleted.map(({ id }) => id),
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

export const recordByType =
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

interface DeleteCaseFilesArgs {
  caseId: string;
  fileIds: string[];
  /** When set, rejects ids that are neither a file of the case nor attached to it. */
  notFoundMessage?: (ids: string[]) => string;
  recordUserActions?: RecordUserActions;
}

/** Deletes files of a case and their attachments, including a file whose attachment was never created. */
export const deleteCaseFiles = async (
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
