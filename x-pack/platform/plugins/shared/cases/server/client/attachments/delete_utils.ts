/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { difference, union } from 'lodash';

import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import { UserActionTypes, UserActionActions } from '../../../common/types/domain';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { AttachmentRequestRtV2 } from '../../../common/types/api';
import { toStringArray } from '../../../common/utils/attachments';
import { decodeOrThrow } from '../../common/runtime_types';
import { getAlertInfoFromComments } from '../../common/utils';
import { getCaseReferenceId } from '../../common/references';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import type { OperationDetails } from '../../authorization';
import { Operations } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import type { AttachmentSavedObjectType } from '../../services/user_actions/types';
import type { CasesClientArgs } from '../types';
import { deleteFiles, getFileEntitiesForCase } from '../files';
import { validateUnifiedAttachments } from './validators';
import type { RelatedAttachmentUpdate } from './related_deletions';
import { getRelatedAttachmentsToDelete } from './related_deletions';
import { emitAttachmentsDeletedEvents } from './trigger_utils';

interface OwnedAttachment extends AttachmentForDeletion {
  owner: string;
}

interface DecodedAttachment extends OwnedAttachment {
  attributes: AttachmentAttributesV2;
  /** The attachment fields recorded in the deletion user action. */
  requestAttributes: AttachmentRequestV2;
}

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
  /**
   * Whether the `onDelete` hooks of the deleted types may take further attachments along. The
   * hooks run either way; false only drops the deletions they ask for.
   */
  includeRelated?: boolean;
}

/** Deletes attachments read for deletion and their files; shared by the comment delete routes. */
export const deleteCaseAttachments = async (
  {
    caseId,
    attachments,
    operation,
    notInCaseMessage = (ids) => doNotExistOnCaseMessage(ids, caseId),
    includeRelated = true,
  }: DeleteCaseAttachmentsArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { caseService, attachmentService },
    logger,
    authorization,
    fileService,
    unifiedAttachmentTypeRegistry,
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

  // Resolved once the requested attachments are known to be valid and authorized, so a hook never
  // runs for a request that is about to be rejected. The hooks run even when the caller declined
  // the related deletions: see `getRelatedAttachmentsToDelete`.
  const { refs: relatedRefs, updates: relatedUpdates } = await getRelatedAttachmentsToDelete({
    caseId,
    attachments: ownedAttachments,
    includeRelated,
    clientArgs,
  });

  // Read for deletion like the requested attachments, so they carry the same file id and the same
  // owner fallback. A file is never taken along: it is deleted through the file attachments
  // endpoint, which removes the file itself as well as the attachment pointing at it.
  const relatedAttachments =
    relatedRefs.length > 0
      ? await withCaseOwnerFallback({
          attachments: (
            await attachmentService.getter.bulkGetForDeletionByType(relatedRefs)
          ).filter(({ fileId }) => fileId == null),
          getCase,
        })
      : [];

  if (relatedAttachments.length > 0) {
    await authorization.ensureAuthorized({
      entities: relatedAttachments.map(({ id, owner }) => ({ id, owner })),
      operation,
    });
  }

  // Read the same way, for the same resolved owner and the same stored payload the shrink is
  // computed against.
  const payloadsById = new Map(relatedUpdates.map(({ id, payload }) => [id, payload]));

  const updateTargets =
    relatedUpdates.length > 0
      ? await withCaseOwnerFallback({
          attachments: await attachmentService.getter.bulkGetForDeletionByType(
            relatedUpdates.map(({ id, type }) => ({ id, type }))
          ),
          getCase,
        })
      : [];

  // Only the attachments that lose content are authorized as updates: they survive the request
  // holding less than they did, and the audit trail should say so. An attachment that only has
  // its provenance rewritten is left under the deletion the caller was already authorized for.
  // Requiring update privileges for that bookkeeping would stop a caller who may delete
  // attachments but not edit them from removing an attack at all, which is a combination Cases
  // grants: read plus the delete sub-feature, with no update.
  const shrinkTargets = updateTargets.filter((target) => {
    const payload = payloadsById.get(target.id);
    const [decoded] = toDecodedAttachment(target, logger);

    // An attachment that does not decode is skipped by the update itself, so it loses nothing.
    return (
      payload != null && decoded != null && dropsStoredContent(decoded.requestAttributes, payload)
    );
  });

  if (shrinkTargets.length > 0) {
    await authorization.ensureAuthorized({
      entities: shrinkTargets.map(({ id, owner }) => ({ id, owner })),
      operation: Operations.updateComment,
    });
  }

  // A hook builds these payloads, so they are checked exactly like ones that arrived over the
  // API, and before anything is deleted: a payload a hook got wrong fails the whole request
  // rather than leaving it half done.
  relatedUpdates.forEach(({ payload }) =>
    validateUnifiedAttachments({ query: payload, unifiedAttachmentTypeRegistry })
  );

  // From here the attachments a hook took along are treated exactly like the requested ones: they
  // are decoded, deleted, and recorded through the same steps.
  const attachmentsToDelete = [...ownedAttachments, ...relatedAttachments];

  // A row that fails to decode is still deleted, but gets no user action, alert update or event.
  const decodedAttachments = attachmentsToDelete.flatMap((attachment) =>
    toDecodedAttachment(attachment, logger)
  );

  // Files are read from the stored fields, so a row that fails to decode still deletes its file.
  // A file linked to another case or with invalid metadata is kept.
  const fileEntities = await getFileEntitiesForCase({
    caseId,
    fileIds: [
      ...new Set(attachmentsToDelete.flatMap(({ fileId }) => (fileId != null ? [fileId] : []))),
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

  const savedObjectIds = attachmentsToDelete.map(({ id }) => id);
  const deletedIds = new Set(await attachmentService.bulkDelete({ savedObjectIds, refresh: true }));

  // Core's bulk delete reports per-object failures instead of throwing. The confirmed deletes are
  // still recorded before throwing, since a retry fails the not found check on those ids.
  const notDeletedIds = savedObjectIds.filter((id) => !deletedIds.has(id));

  if (deletedIds.size > 0) {
    // A file is kept while any attachment that was not deleted still references it.
    const keptFileIds = new Set(
      [...attachmentsToDelete, ...fileReferences].flatMap(({ id, fileId }) =>
        !deletedIds.has(id) && fileId != null ? [fileId] : []
      )
    );

    await applyAttachmentUpdates(
      { caseId, updates: relatedUpdates, targets: updateTargets },
      clientArgs
    );

    await recordDeletion(
      {
        caseId,
        attachments: decodedAttachments.filter(({ id }) => deletedIds.has(id)),
        fileIds: fileEntities.filter(({ id }) => !keptFileIds.has(id)).map(({ id }) => id),
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
}

const recordDeletion = async (
  { caseId, attachments, fileIds }: RecordDeletionArgs,
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

  // Recomputed from the index rather than decremented, so the stats are right for any subset.
  await updateCaseAttachmentStats({
    caseService,
    attachmentService,
    caseId,
    user,
  });

  if (attachments.length > 0) {
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

  await handleAlerts({
    alertsService,
    attachments: attachments.map(({ attributes }) => attributes),
    caseId,
  });

  emitAttachmentsDeletedEvents(clientArgs, caseId, attachments);
};

interface ApplyAttachmentUpdatesArgs {
  caseId: string;
  updates: RelatedAttachmentUpdate[];
  targets: OwnedAttachment[];
}

/**
 * Rewrites the attachments a hook asked to shrink instead of delete, and unlinks the alerts they
 * no longer hold.
 *
 * Runs after the deletes and before the case stats are recomputed, so the counts are taken once
 * both halves of the removal are in the index. Each write is guarded by the version the hook
 * computed against, so two removals that shrink the same attachment cannot put back what the
 * other took out. Unlike the PUT route a conflict is not surfaced: the deletions are already in
 * the index, so the write is recomputed against the copy that won and tried again.
 */
const applyAttachmentUpdates = async (
  { caseId, updates, targets }: ApplyAttachmentUpdatesArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    user,
    logger,
    services: { userActionService, alertsService },
  } = clientArgs;

  const targetsById = new Map(targets.map((target) => [target.id, target]));

  // An attachment whose stored fields do not decode cannot be shrunk: without the payload the
  // update replaces there is no way to tell what it is losing.
  const appliableUpdates = updates.flatMap(({ id, type, payload }) => {
    const target = targetsById.get(id);
    const [decoded] = target != null ? toDecodedAttachment(target, logger) : [];

    return decoded == null ? [] : [{ id, type, payload, stored: decoded }];
  });

  if (appliableUpdates.length === 0) {
    return;
  }

  const updatedAt = new Date().toISOString();

  // Only what actually landed, and in the shape it landed in: a write that kept conflicting
  // leaves nothing behind, and one that was recomputed against a newer copy left different
  // alerts than the hook first asked for.
  const writtenUpdates = [];

  for (const { id, type, payload, stored } of appliableUpdates) {
    const written = await writeAttachmentUpdate(
      { id, type, payload, stored, updatedAt },
      clientArgs
    );

    if (written != null) {
      writtenUpdates.push({ id, type, ...written });
    }
  }

  // An update that drops nothing only rewrites bookkeeping the attachment keeps about where it
  // came from. Nothing the analyst sees changed, so it gets no activity entry and no alert is
  // unlinked.
  const shrunkAttachments = writtenUpdates.flatMap(({ id, type, payload, stored }) =>
    dropsStoredContent(stored.requestAttributes, payload)
      ? [
          {
            id,
            owner: stored.owner,
            savedObjectType: type,
            attachment: toDroppedPayload(stored.requestAttributes, payload),
            payload,
          },
        ]
      : []
  );

  if (shrunkAttachments.length === 0) {
    return;
  }

  // What left the case is recorded as a deletion of the part that left, so the activity reads as
  // the alerts being removed rather than as an unexplained edit, and so a connector push forgets
  // them. The update that follows puts back what the attachment still holds: the two are read in
  // order, and a deletion alone would drop the kept alerts from the push as well.
  await userActionService.creator.bulkCreateAttachmentDeletion({
    caseId,
    attachments: shrunkAttachments.map(({ id, owner, savedObjectType, attachment }) => ({
      id,
      owner,
      savedObjectType,
      attachment,
    })),
    user,
  });

  for (const { id, owner, savedObjectType, payload } of shrunkAttachments) {
    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.comment,
        action: UserActionActions.update,
        caseId,
        savedObjectId: id,
        savedObjectType,
        payload: { attachment: payload },
        user,
        owner,
      },
    });
  }

  const alerts = getAlertInfoFromComments(shrunkAttachments.map(({ attachment }) => attachment));

  if (alerts.length > 0) {
    await alertsService.removeCaseIdFromAlerts({ alerts, caseId });
  }
};

/** How many times a shrink is recomputed against a copy that changed under it before giving up. */
const MAX_UPDATE_ATTEMPTS = 3;

interface WriteAttachmentUpdateArgs {
  id: string;
  type: AttachmentSavedObjectType;
  payload: RelatedAttachmentUpdate['payload'];
  stored: DecodedAttachment;
  updatedAt: string;
}

/**
 * Writes one shrink or relabel, guarded by the version of the copy it was computed from.
 *
 * The hook decides what an attachment keeps by reading it, so two removals that touch the same
 * attachment both compute a remainder from the copy they read. Writing those remainders blindly
 * lets the later one put back the alerts the earlier one took out. The version turns that into a
 * conflict, and the conflict is resolved by re-reading the attachment and reapplying this
 * removal to the copy that won, rather than by replacing it wholesale.
 *
 * Returns what was written over what, so the activity entry and the alert unlinking describe the
 * write that landed. Nothing is returned when nothing landed: the deletions are already in the
 * index, so a conflict that outlives the attempts leaves the attachment as it stands rather than
 * failing a delete that worked.
 */
const writeAttachmentUpdate = async (
  { id, type, payload, stored, updatedAt }: WriteAttachmentUpdateArgs,
  clientArgs: CasesClientArgs
): Promise<
  { payload: RelatedAttachmentUpdate['payload']; stored: DecodedAttachment } | undefined
> => {
  const {
    user,
    logger,
    services: { attachmentService },
  } = clientArgs;

  let current = stored;
  let currentPayload = payload;

  for (let attempt = 1; attempt <= MAX_UPDATE_ATTEMPTS; attempt++) {
    try {
      // The stored references are written back because the attribute extraction that runs on
      // update does not know about the case reference and would otherwise drop it.
      await attachmentService.update({
        savedObjectId: id,
        updatedAttributes: { ...currentPayload, updated_at: updatedAt, updated_by: user },
        options: { references: current.references, refresh: true, version: current.version },
      });

      return { payload: currentPayload, stored: current };
    } catch (error) {
      if (!isConflictError(error)) {
        throw error;
      }

      if (attempt === MAX_UPDATE_ATTEMPTS) {
        logger.warn(
          `Attachment ${id} kept changing while being shrunk and was left as it stands: ${error}`
        );
        return;
      }

      const [refetched] = await attachmentService.getter.bulkGetForDeletionByType([{ id, type }]);
      const [fresh] =
        refetched != null && hasOwner(refetched) ? toDecodedAttachment(refetched, logger) : [];

      // Gone or undecodable: there is nothing left to take the alerts out of.
      if (fresh == null) {
        logger.warn(`Attachment ${id} changed while being shrunk and can no longer be read`);
        return;
      }

      currentPayload = rebaseOntoCurrent({
        stored: current.requestAttributes,
        payload: currentPayload,
        current: fresh.requestAttributes,
      });
      current = fresh;
    }
  }
};

const isConflictError = (error: unknown): boolean =>
  Boom.isBoom(error)
    ? error.output.statusCode === 409
    : (error as { statusCode?: number })?.statusCode === 409;

/**
 * Reapplies a removal to the copy of the attachment that is actually stored.
 *
 * Only what this removal did is carried over: the alerts it dropped, the provenance it stopped
 * claiming, and the provenance it took on. Everything else comes from the current copy, so
 * whatever another removal did in the meantime survives.
 */
const rebaseOntoCurrent = ({
  stored,
  payload,
  current,
}: {
  stored: AttachmentRequestV2;
  payload: RelatedAttachmentUpdate['payload'];
  current: AttachmentRequestV2;
}): RelatedAttachmentUpdate['payload'] => {
  const dropped = toDroppedPayload(stored, payload);
  const droppedIds = new Set('attachmentId' in dropped ? toStringArray(dropped.attachmentId) : []);

  const storedSources = readSourceAttachmentIds(stored);
  const payloadSources = readSourceAttachmentIds(payload);
  const droppedSources = new Set(difference(storedSources, payloadSources));
  const addedSources = difference(payloadSources, storedSources);

  const currentIds = 'attachmentId' in current ? toStringArray(current.attachmentId) : [];
  const keptPositions = currentIds.flatMap((alertId, position) =>
    droppedIds.has(alertId) ? [] : [position]
  );

  // `metadata.index` runs parallel to `attachmentId`, exactly as it does in `toDroppedPayload`.
  const currentIndex = 'metadata' in current ? current.metadata?.index : undefined;
  const index =
    Array.isArray(currentIndex) && currentIndex.length === currentIds.length
      ? keptPositions.map((position) => currentIndex[position])
      : currentIndex;

  const currentSources = readSourceAttachmentIds(current);
  const sourceAttachmentIds = union(
    currentSources.filter((sourceId) => !droppedSources.has(sourceId)),
    addedSources
  );

  return {
    ...current,
    attachmentId: keptPositions.map((position) => currentIds[position]),
    metadata: {
      ...('metadata' in current ? current.metadata : {}),
      index,
      // Written back even when it empties, so the spread above cannot restore the provenance
      // this removal is giving up. Left alone on an attachment that never carried any and is
      // not being given any.
      ...(currentSources.length > 0 || addedSources.length > 0 ? { sourceAttachmentIds } : {}),
    },
  } as RelatedAttachmentUpdate['payload'];
};

const readSourceAttachmentIds = (attachment: object): string[] => {
  const metadata = 'metadata' in attachment ? attachment.metadata : undefined;
  const sourceIds =
    metadata != null && typeof metadata === 'object' && 'sourceAttachmentIds' in metadata
      ? metadata.sourceAttachmentIds
      : undefined;

  return Array.isArray(sourceIds)
    ? sourceIds.filter((id): id is string => typeof id === 'string')
    : [];
};

/**
 * Whether an update takes anything away from what the attachment holds.
 *
 * This is what separates a shrink from a relabel. A shrink removes alerts from the case and so
 * needs update privileges, an activity entry and the alerts unlinking; a relabel moves only the
 * provenance an attachment carries, and rides along with the deletion that caused it.
 */
const dropsStoredContent = (
  stored: AttachmentRequestV2,
  payload: RelatedAttachmentUpdate['payload']
): boolean => {
  const dropped = toDroppedPayload(stored, payload);

  return 'attachmentId' in dropped && toStringArray(dropped.attachmentId).length > 0;
};

/**
 * The part of the stored payload the update drops, used to unlink exactly the alerts that left.
 *
 * `metadata.index` runs parallel to `attachmentId`, so the dropped indices are taken by position.
 * A scalar index applies to every alert and is kept as is; an array that does not line up is left
 * alone rather than realigned on a guess.
 */
const toDroppedPayload = (
  stored: AttachmentRequestV2,
  payload: RelatedAttachmentUpdate['payload']
): AttachmentRequestV2 => {
  const storedIds = 'attachmentId' in stored ? toStringArray(stored.attachmentId) : [];
  const keptIds = new Set('attachmentId' in payload ? toStringArray(payload.attachmentId) : []);
  const droppedPositions = storedIds.flatMap((id, position) => (keptIds.has(id) ? [] : [position]));

  const storedIndex = 'metadata' in stored ? stored.metadata?.index : undefined;
  const index =
    Array.isArray(storedIndex) && storedIndex.length === storedIds.length
      ? droppedPositions.map((position) => storedIndex[position])
      : storedIndex;

  return {
    ...stored,
    attachmentId: droppedPositions.map((position) => storedIds[position]),
    metadata: { ...('metadata' in stored ? stored.metadata : {}), index },
  } as AttachmentRequestV2;
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

const updateCaseAttachmentStats = async ({
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
