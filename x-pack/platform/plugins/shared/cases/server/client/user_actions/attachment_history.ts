/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentHistoryResponse } from '../../../common/types/api';
import { AttachmentHistoryResponseSchema } from '../../../common/types/api';
import { decodeOrThrowZod } from '../../common/runtime_types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { CasesClientArgs } from '../types';
import type { CasesClient } from '../client';
import type { AttachmentHistoryRequest } from './types';
import { formatSavedObject } from './utils';

/**
 * Returns the create and edit user actions of a single attachment, oldest first.
 */
export const getAttachmentHistory = async (
  { caseId, attachmentId }: AttachmentHistoryRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<AttachmentHistoryResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    // Authorizes the attachment and checks it belongs to the case.
    await casesClient.attachments.get({ caseID: caseId, savedObjectId: attachmentId });

    const { filter, ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
      Operations.findUserActions
    );

    const userActions = await userActionService.finder.findAttachmentHistory({
      caseId,
      attachmentId,
      filter,
    });

    ensureSavedObjectsAreAuthorized(
      userActions.map((so) => ({ owner: so.attributes.owner, id: so.id }))
    );

    return decodeOrThrowZod(AttachmentHistoryResponseSchema)({
      userActions: userActions.map(formatSavedObject),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to get history for attachment id: ${attachmentId} in case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
