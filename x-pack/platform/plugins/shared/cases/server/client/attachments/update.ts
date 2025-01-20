/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { AttachmentPatchRequestRt } from '../../../common/types/api';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { isCommentRequestTypeExternalReference } from '../../../common/utils/attachments';
import type { Case } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasesClientArgs } from '..';
import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';
import type { UpdateArgs } from './types';
import { validateMaxUserActions } from '../../common/validators';

/**
 * Update an attachment.
 *
 * @ignore
 */
export async function update(
  { caseID, updateRequest: queryParams }: UpdateArgs,
  clientArgs: CasesClientArgs
): Promise<Case> {
  const {
    services: { attachmentService, userActionService },
    logger,
    authorization,
    externalReferenceAttachmentTypeRegistry,
  } = clientArgs;

  try {
    const {
      id: queryCommentId,
      version: queryCommentVersion,
      ...queryRestAttributes
    } = decodeWithExcessOrThrow(AttachmentPatchRequestRt)(queryParams);
    await validateMaxUserActions({
      caseId: caseID,
      userActionService,
      userActionsToAdd: 1,
    });

    decodeCommentRequest(queryRestAttributes, externalReferenceAttachmentTypeRegistry);

    const myComment = await attachmentService.getter.get({
      attachmentId: queryCommentId,
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

    if (
      isCommentRequestTypeExternalReference(myComment.attributes) &&
      isCommentRequestTypeExternalReference(queryRestAttributes) &&
      myComment.attributes.externalReferenceStorage.type !==
        queryRestAttributes.externalReferenceStorage.type
    ) {
      throw Boom.badRequest(`You cannot change the storage type of an external reference comment.`);
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
      updateRequest: queryParams,
      updatedAt: updatedDate,
      owner: myComment.attributes.owner,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed to patch comment case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
