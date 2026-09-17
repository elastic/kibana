/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { AttachmentV2, Case, UnifiedAttachment } from '../../../common/types/domain';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import {
  UnifiedAttachmentPayloadRt,
  UnifiedAttachmentRt,
} from '../../../common/types/domain/attachment/v2';
import type { AttachmentRequestV2 } from '../../../common/types/api';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { getIDsAndIndicesAsArrays } from '../../common/utils';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import type { AddArgs } from './types';
import { validateUnifiedAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { extractAndAddObservables } from './extract_observables';
import { emitAttachmentsAddedEvent } from './trigger_utils';

/**
 * Duplicate alert/event ids are dropped before persist. Prefer the newly created
 * SO, otherwise an existing attachment that already holds one of those ids.
 */
const pickCreatedOrExistingAttachment = (
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

  return comments?.find((comment) =>
    getIDsAndIndicesAsArrays(comment as AttachmentRequestV2).ids.some((id) =>
      requestedIdSet.has(id)
    )
  );
};

export interface AddCommentResult {
  attachment: UnifiedAttachment;
  theCase: Case;
}

/**
 * Creates an attachment. Public `attachments.add` returns only `attachment`.
 * Legacy `POST /comments` uses `theCase` from this same encode (not a second get).
 */
export const addComment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<AddCommentResult> => {
  const { comment, caseId } = addArgs;

  const {
    logger,
    authorization,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrow(UnifiedAttachmentPayloadRt)(comment);

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
    const updatedModel = await model.createComment({
      createdDate,
      commentReq: query,
      id: savedObjectID,
    });

    const updatedCase = await updatedModel.encodeWithComments();

    const attachment = pickCreatedOrExistingAttachment(updatedCase.comments, savedObjectID, query);
    if (attachment == null) {
      throw new Error(`Failed to locate created attachment ${savedObjectID} on case ${caseId}`);
    }

    if (attachment.id === savedObjectID) {
      emitAttachmentsAddedEvent(clientArgs, updatedCase, [savedObjectID], query.type);
      // This call never throws — failures are logged and do not abort the attachment creation.
      await extractAndAddObservables(caseId, [query], updatedCase, clientArgs);
    }

    return {
      attachment: decodeOrThrow(UnifiedAttachmentRt)(attachment),
      theCase: updatedCase,
    };
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
