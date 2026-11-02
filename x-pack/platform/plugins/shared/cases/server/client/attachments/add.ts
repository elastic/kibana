/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { AttachmentV2, Case, UnifiedAttachment } from '../../../common/types/domain';
import {
  UnifiedAttachmentPayloadSchema,
  type UnifiedAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { MAX_DOCS_PER_PAGE } from '../../../common/constants';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import {
  flattenAttachmentSavedObject,
  flattenAttachmentSavedObjects,
  getIDsAndIndicesAsArrays,
} from '../../common/utils';
import { isAlertAttachmentType, isEventAttachmentType } from '../../../common/utils/attachments';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { toUnifiedAttachment } from '../../services/attachments/operations/utils';
import type { AttachmentSavedObjectTransformedV2 } from '../../common/types/attachments_v2';
import type { AddArgs } from './types';
import { validateUnifiedAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { extractAndAddObservables } from './extract_observables';
import { emitAttachmentsAddedEvent } from './trigger_utils';

const isSameAlertOrEventFamily = (storedType: string, requestType: string): boolean => {
  if (isAlertAttachmentType(requestType)) {
    return isAlertAttachmentType(storedType);
  }
  if (isEventAttachmentType(requestType)) {
    return isEventAttachmentType(storedType);
  }
  return storedType === requestType;
};

/**
 * Locates the attachment that already covers a create whose ids are all on the case.
 */
export const findExistingAttachment = (
  attachments: AttachmentV2[],
  query: UnifiedAttachmentPayload
): AttachmentV2 | undefined => {
  const requestedIds = getIDsAndIndicesAsArrays(query).ids;
  if (requestedIds.length === 0) {
    return undefined;
  }

  const requestedIdSet = new Set(requestedIds);

  return attachments.find(
    (attachment) =>
      isSameAlertOrEventFamily(attachment.type, query.type) &&
      getIDsAndIndicesAsArrays(attachment as AttachmentRequestV2).ids.some((id) =>
        requestedIdSet.has(id)
      )
  );
};

const getExistingAttachment = async (
  caseId: string,
  query: UnifiedAttachmentPayload,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> => {
  const comments = await clientArgs.services.caseService.getAllCaseComments({
    id: caseId,
    options: {
      fields: [],
      page: 1,
      perPage: MAX_DOCS_PER_PAGE,
    },
  });

  const existing = findExistingAttachment(
    flattenAttachmentSavedObjects(comments.saved_objects),
    query
  );

  if (existing == null) {
    throw Boom.notFound(`Failed to locate the existing attachment on case ${caseId}`);
  }

  return toUnifiedAttachment(existing);
};

const createAttachment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<{
  query: UnifiedAttachmentPayload;
  model: CaseCommentModel;
  createdAttachment?: AttachmentSavedObjectTransformedV2;
}> => {
  const { comment, caseId } = addArgs;

  const {
    logger,
    authorization,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrowZod(UnifiedAttachmentPayloadSchema)(comment);

    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });

    const savedObjectID = SavedObjectsUtils.generateId();
    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [
        {
          id: savedObjectID,
          owner: query.owner,
        },
      ],
    });

    validateUnifiedAttachments({
      query,
      unifiedAttachmentTypeRegistry,
    });

    const createdDate = new Date().toISOString();

    const model = await CaseCommentModel.create(caseId, clientArgs);
    const { model: updatedModel, attachment: createdAttachment } = await model.createComment({
      createdDate,
      commentReq: query,
      id: savedObjectID,
    });

    if (createdAttachment == null) {
      return { query, model: updatedModel };
    }

    const {
      attributes: { owner, settings },
    } = model.savedObject;

    emitAttachmentsAddedEvent(clientArgs, { id: caseId, owner }, [savedObjectID], query.type);
    // This call never throws — failures are logged and do not abort the attachment creation.
    await extractAndAddObservables(caseId, [query], { settings }, clientArgs);

    return { query, model: updatedModel, createdAttachment };
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Create an attachment to a case. Returns the created attachment, or the attachment that
 * already covers the request when every referenced id is on the case.
 *
 * @ignore
 */
export const addComment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> => {
  const { query, createdAttachment } = await createAttachment(addArgs, clientArgs);

  if (createdAttachment == null) {
    return getExistingAttachment(addArgs.caseId, query, clientArgs);
  }

  return toUnifiedAttachment(flattenAttachmentSavedObject(createdAttachment));
};

/**
 * Create an attachment to a case. Returns the case with all its attachments.
 *
 * @ignore
 */
export const addCommentAndGetCase = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const { model } = await createAttachment(addArgs, clientArgs);

  return model.encodeWithComments();
};
