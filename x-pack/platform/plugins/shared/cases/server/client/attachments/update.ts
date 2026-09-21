/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { UnifiedAttachmentPutRequestRt } from '../../../common/types/api';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { UnifiedAttachment } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { toUnifiedAttachment } from '../../services/attachments/operations/utils';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import type { UpdateArgs } from './types';
import { validateMaxUserActions } from '../../common/validators';
import { validateUnifiedAttachments } from './validators';

export async function update(
  { caseID, updateRequest: queryParams }: UpdateArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment> {
  const {
    services: { attachmentService, userActionService },
    logger,
    authorization,
    unifiedAttachmentTypeRegistry,
  } = clientArgs;

  try {
    const { id: queryCommentId, ...putRequest } = queryParams;
    const { version: queryCommentVersion, ...queryRestAttributes } = decodeWithExcessOrThrow(
      UnifiedAttachmentPutRequestRt
    )(putRequest);

    await validateMaxUserActions({
      caseId: caseID,
      userActionService,
      userActionsToAdd: 1,
    });

    validateUnifiedAttachments({
      query: queryRestAttributes,
      unifiedAttachmentTypeRegistry,
    });

    const myComment = await attachmentService.getter.get({
      savedObjectId: queryCommentId,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${queryCommentId} does not exist anymore.`);
    }

    await authorization.ensureAuthorized({
      entities: [{ owner: myComment.attributes.owner, id: myComment.id }],
      operation: Operations.updateComment,
    });

    const model = await CaseCommentModel.create(caseID, clientArgs);

    if (myComment.attributes.type !== queryRestAttributes.type) {
      throw Boom.badRequest(`You cannot change the type of the comment.`);
    }

    if (myComment.attributes.owner !== queryRestAttributes.owner) {
      throw Boom.badRequest(`You cannot change the owner of the comment.`);
    }

    const caseRef = myComment.references.find((c) => c.type === CASE_SAVED_OBJECT);
    if (caseRef == null || (caseRef != null && caseRef.id !== model.savedObject.id)) {
      throw Boom.notFound(
        `This comment ${queryCommentId} does not exist in ${model.savedObject.id}).`
      );
    }

    if (queryCommentVersion !== myComment.version) {
      throw Boom.conflict(
        'This case has been updated. Please refresh before saving additional updates.'
      );
    }

    const updatedDate = new Date().toISOString();

    const updatedModel = await model.updateComment({
      updateRequest: {
        id: queryCommentId,
        version: queryCommentVersion,
        ...queryRestAttributes,
      },
      updatedAt: updatedDate,
      owner: myComment.attributes.owner,
    });

    const updatedCase = await updatedModel.encodeWithComments();

    const attachment = updatedCase.comments?.find((c) => c.id === queryCommentId);
    if (attachment == null) {
      throw new Error(`Failed to locate updated attachment ${queryCommentId} on case ${caseID}`);
    }

    return toUnifiedAttachment(attachment);
  } catch (error) {
    throw createCaseError({
      message: `Failed to replace attachment case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
