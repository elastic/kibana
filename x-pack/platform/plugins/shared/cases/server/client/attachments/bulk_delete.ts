/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import {
  BulkDeleteAttachmentsByAttachmentIdRequestRt,
  BulkDeleteAttachmentsBySavedObjectIdRequestRt,
  BulkDeleteFileAttachmentsRequestRt,
} from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { BulkDeleteArgs, BulkDeleteFileArgs } from './types';
import type { CasesClient } from '../client';
import {
  deleteByAttachmentIds,
  deleteCaseAttachments,
  deleteCaseFiles,
  deleteRelatedAttachments,
  doNotExistOnCaseMessage,
  recordByType,
} from './delete_utils';

/**
 * Deletes attachments from a case, by saved object id or by the ids an attachment type references,
 * and records one `bulkAttachments` user action per attachment type. Rejects the request if any id
 * is not found.
 */
export const bulkDeleteAttachments = async (
  args: BulkDeleteArgs,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const { caseId, includeRelated = true } = args;
  const { logger } = clientArgs;

  try {
    if ('savedObjectIds' in args) {
      const request = decodeWithExcessOrThrow(BulkDeleteAttachmentsBySavedObjectIdRequestRt)({
        ids: args.savedObjectIds,
      });
      await deleteBySavedObjectIds(
        { caseId, savedObjectIds: request.ids, includeRelated },
        clientArgs
      );
    } else {
      const request = decodeWithExcessOrThrow(BulkDeleteAttachmentsByAttachmentIdRequestRt)({
        type: args.type,
        attachmentIds: args.attachmentIds,
      });
      await deleteByAttachmentIds({ caseId, ...request, includeRelated }, clientArgs);
    }
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk delete attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const deleteBySavedObjectIds = async (
  {
    caseId,
    savedObjectIds,
    includeRelated,
  }: { caseId: string; savedObjectIds: string[]; includeRelated: boolean },
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    services: { attachmentService },
  } = clientArgs;

  const uniqueIds = [...new Set(savedObjectIds)];
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
      recordUserActions: recordByType(caseId, clientArgs),
      beforeDelete: includeRelated
        ? (decoded) => deleteRelatedAttachments({ caseId, attachments: decoded }, clientArgs)
        : undefined,
    },
    clientArgs
  );
};

/** Deletes files of a case and the attachments that reference them. */
export const bulkDeleteFileAttachments = async (
  { caseId, fileIds }: BulkDeleteFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<void> => {
  const { logger } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkDeleteFileAttachmentsRequestRt)({ ids: fileIds });

    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    await deleteCaseFiles({ caseId, fileIds: request.ids }, clientArgs);
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
