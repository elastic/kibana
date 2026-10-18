/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { DeleteAllArgs, DeleteArgs } from './types';
import { deleteCaseAttachments } from './delete_utils';

/**
 * Delete all comments for a case.
 */
export async function deleteAll(
  { caseID }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    const attachmentIds = await attachmentService.getter.getAttachmentIdsForCases({
      caseIds: [caseID],
    });
    const attachments = await attachmentService.getter.bulkGetForDeletionByType(attachmentIds);

    if (attachments.length <= 0) {
      throw Boom.notFound(`No comments found for ${caseID}.`);
    }

    await deleteCaseAttachments(
      {
        caseId: caseID,
        attachments,
        operation: Operations.deleteAllComments,
      },
      clientArgs
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete all comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Deletes an attachment
 */
export async function deleteComment(
  { caseID, savedObjectId }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  const {
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    const attachments = await attachmentService.getter.bulkGetForDeletion([savedObjectId]);

    if (attachments.length <= 0) {
      throw Boom.notFound(`This comment ${savedObjectId} does not exist anymore.`);
    }

    await deleteCaseAttachments(
      {
        caseId: caseID,
        attachments,
        operation: Operations.deleteComment,
        notInCaseMessage: () => `This comment ${savedObjectId} does not exist in ${caseID}.`,
      },
      clientArgs
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete comment: ${caseID} comment id: ${savedObjectId}: ${error}`,
      error,
      logger,
    });
  }
}
