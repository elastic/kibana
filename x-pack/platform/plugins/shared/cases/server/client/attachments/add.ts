/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { AttachmentV2, Case } from '../../../common/types/domain';
import {
  UnifiedAttachmentPayloadRt,
  type UnifiedAttachmentPayload,
} from '../../../common/types/domain/attachment/v2';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { getIDsAndIndicesAsArrays } from '../../common/utils';
import { isAlertAttachmentType, isEventAttachmentType } from '../../../common/utils/attachments';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
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
 * Locates the attachment produced by a create: the newly created one, or on a
 * duplicate alert/event request the existing attachment that already covers it.
 * Used by the internal write route to derive the unified single-attachment
 * response from the encoded case.
 */
export const pickCreatedOrExistingAttachment = (
  comments: AttachmentV2[] | undefined,
  savedObjectID: string,
  query: UnifiedAttachmentPayload
): AttachmentV2 | undefined => {
  const created = comments?.find((comment) => comment.id === savedObjectID);
  if (created != null) {
    return created;
  }

  const requestedIds = getIDsAndIndicesAsArrays(query).ids;
  if (requestedIds.length === 0) {
    return undefined;
  }

  const requestedIdSet = new Set(requestedIds);

  return comments?.find(
    (comment) =>
      isSameAlertOrEventFamily(comment.type, query.type) &&
      getIDsAndIndicesAsArrays(comment as AttachmentRequestV2).ids.some((id) =>
        requestedIdSet.has(id)
      )
  );
};

/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export const addComment = async (addArgs: AddArgs, clientArgs: CasesClientArgs): Promise<Case> => {
  const { comment, caseId, id } = addArgs;

  const {
    logger,
    authorization,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrow(UnifiedAttachmentPayloadRt)(comment);

    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });

    const savedObjectID = id ?? SavedObjectsUtils.generateId();
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
    const updatedModel = await model.createComment({
      createdDate,
      commentReq: query,
      id: savedObjectID,
    });

    const updatedCase = await updatedModel.encodeWithComments();

    const created = updatedCase.comments?.some((c) => c.id === savedObjectID) ?? false;
    if (created) {
      emitAttachmentsAddedEvent(clientArgs, updatedCase, [savedObjectID], query.type);
      // This call never throws — failures are logged and do not abort the attachment creation.
      await extractAndAddObservables(caseId, [query], updatedCase, clientArgs);
    }

    return updatedCase;
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
