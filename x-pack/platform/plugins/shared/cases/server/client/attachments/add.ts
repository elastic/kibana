/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import { AttachmentRequestRt } from '../../../common/types/api';
import type { Case } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';
import type { AddArgs } from './types';
import { validateRegisteredAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';

/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export const addComment = async (addArgs: AddArgs, clientArgs: CasesClientArgs): Promise<Case> => {
  const { comment, caseId } = addArgs;

  const {
    logger,
    authorization,
    persistableStateAttachmentTypeRegistry,
    externalReferenceAttachmentTypeRegistry,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrow(AttachmentRequestRt)(comment);

    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });
    decodeCommentRequest(comment, externalReferenceAttachmentTypeRegistry);

    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner: comment.owner, id: savedObjectID }],
    });

    validateRegisteredAttachments({
      query,
      persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
      unifiedAttachmentTypeRegistry,
    });

    const createdDate = new Date().toISOString();

    const model = await CaseCommentModel.create(caseId, clientArgs);

    const updatedModel = await model.createComment({
      createdDate,
      commentReq: query,
      id: savedObjectID,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
