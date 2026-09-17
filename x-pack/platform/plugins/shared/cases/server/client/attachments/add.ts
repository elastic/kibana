/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import { UnifiedAttachmentPayloadRt } from '../../../common/types/domain/attachment/v2';
import type { Case } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import { decodeCommentRequestV2 } from '../utils';
import { Operations } from '../../authorization';
import type { AddArgs } from './types';
import { validateRegisteredAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { extractAndAddObservables } from './extract_observables';
import { emitAttachmentsAddedEvent } from './trigger_utils';

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
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const query = decodeWithExcessOrThrow(UnifiedAttachmentPayloadRt)(comment);
    decodeCommentRequestV2(query, unifiedAttachmentTypeRegistry);

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

    validateRegisteredAttachments({
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

    emitAttachmentsAddedEvent(clientArgs, updatedCase, [savedObjectID], query.type);

    // This call never throws — failures are logged and do not abort the attachment creation.
    await extractAndAddObservables(caseId, [query], updatedCase, clientArgs);

    return updatedCase;
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
