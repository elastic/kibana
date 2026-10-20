/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import {
  BulkDeleteAttachmentsRequestRt,
  BulkDeleteFileAttachmentsRequestRt,
} from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { BulkDeleteArgs, BulkDeleteFileArgs } from './types';
import type { CasesClient } from '../client';
import { deleteFiles, getFileEntitiesForCase } from '../files';
import { deleteCaseAttachments, doNotExistOnCaseMessage } from './delete_utils';

/** Deletes attachments of any type from a case, rejecting the request if any id is not found. */
export const bulkDeleteAttachments = async (
  { caseId, savedObjectIds }: BulkDeleteArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkDeleteAttachmentsRequestRt)({
      ids: savedObjectIds,
    });
    const uniqueIds = [...new Set(request.ids)];

    const attachments = await attachmentService.getter.bulkGetForDeletion(uniqueIds);
    const foundIds = new Set(attachments.map(({ id }) => id));
    const missingIds = uniqueIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      throw Boom.notFound(doNotExistOnCaseMessage(missingIds, caseId));
    }

    await deleteCaseAttachments(
      {
        caseId,
        attachments,
        operation: Operations.deleteComment,
      },
      clientArgs
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk delete attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/** Deletes files of a case and the attachments that reference them. */
export const bulkDeleteFileAttachments = async (
  { caseId, fileIds }: BulkDeleteFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<void> => {
  const {
    services: { attachmentService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkDeleteFileAttachmentsRequestRt)({ ids: fileIds });

    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    // Rejects a file linked to another case before anything is deleted.
    const fileEntities = await getFileEntitiesForCase({
      caseId,
      fileIds: request.ids,
      fileService,
      logger,
    });

    const attachments = await attachmentService.getter.getFileAttachmentsForDeletion({
      caseId,
      fileIds: request.ids,
    });

    // A file has no attachment when creating the attachment failed after the upload.
    const attachedFileIds = new Set(attachments.map(({ fileId }) => fileId));
    const unattachedFileEntities = fileEntities.filter(({ id }) => !attachedFileIds.has(id));

    if (unattachedFileEntities.length > 0) {
      await authorization.ensureAuthorized({
        entities: unattachedFileEntities,
        operation: Operations.deleteComment,
      });
    }

    if (attachments.length > 0) {
      await deleteCaseAttachments(
        { caseId, attachments, operation: Operations.deleteComment },
        clientArgs
      );
    }

    await deleteFiles(
      unattachedFileEntities.map(({ id }) => id),
      fileService
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
