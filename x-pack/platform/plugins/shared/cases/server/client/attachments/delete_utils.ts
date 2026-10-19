/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { AttachmentAttributesV2 } from '../../../common/types/domain';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { AttachmentRequestRtV2 } from '../../../common/types/api';
import { decodeOrThrow } from '../../common/runtime_types';
import { getAlertInfoFromComments } from '../../common/utils';
import { getCaseReferenceId } from '../../common/references';
import type { CaseSavedObjectTransformed } from '../../common/types/case';
import type { OperationDetails } from '../../authorization';
import type { AttachmentForDeletion } from '../../services/attachments/types';
import type { CasesClientArgs } from '../types';
import { deleteFiles, getFileEntitiesForCase } from '../files';
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
}

/** Deletes attachments read for deletion and their files; shared by the comment delete routes. */
export const deleteCaseAttachments = async (
  {
    caseId,
    attachments,
    operation,
    notInCaseMessage = (ids) => doNotExistOnCaseMessage(ids, caseId),
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

  const savedObjectIds = ownedAttachments.map(({ id }) => id);
  const deletedIds = new Set(await attachmentService.bulkDelete({ savedObjectIds, refresh: true }));

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
