/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case, UnifiedAttachment } from '../../../common/types/domain';
import { UnifiedAttachmentPayloadSchema } from '../../../common/types/domain/attachment/v2';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { flattenAttachmentSavedObject } from '../../common/utils';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { toUnifiedAttachment } from '../../services/attachments/operations/utils';
import type { AttachmentSavedObjectTransformedV2 } from '../../common/types/attachments_v2';
import type { AddArgs } from './types';
import { validateUnifiedAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { extractAndAddObservables } from './extract_observables';
import { emitAttachmentsAddedEvent } from './trigger_utils';

const createAttachment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<{
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
      return { model: updatedModel };
    }

    const {
      attributes: { owner, settings },
    } = model.savedObject;

    emitAttachmentsAddedEvent(clientArgs, { id: caseId, owner }, [savedObjectID], query.type);
    // This call never throws — failures are logged and do not abort the attachment creation.
    await extractAndAddObservables(caseId, [query], { settings }, clientArgs);

    return { model: updatedModel, createdAttachment };
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Create an attachment to a case. Returns the created attachment, or throws a 409 when every
 * referenced id is already on the case.
 *
 * @ignore
 */
export const addComment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> => {
  const { createdAttachment } = await createAttachment(addArgs, clientArgs);

  if (createdAttachment == null) {
    throw Boom.conflict(`Every id in the request is already attached to case ${addArgs.caseId}.`);
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
