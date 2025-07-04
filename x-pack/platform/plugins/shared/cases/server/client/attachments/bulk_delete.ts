/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { PromiseResult, PromiseRejectedResult } from 'p-settle';
import pSettle from 'p-settle';
import { partition } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { File, FileJSON } from '@kbn/files-plugin/common';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { BulkDeleteFileAttachmentsRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { BulkDeleteFileArgs } from './types';
import { CaseFileMetadataForDeletionRt } from '../../../common/files';
import type { CasesClient } from '../client';
import { createFileEntities, deleteFiles } from '../files';

export const bulkDeleteFileAttachments = async (
  { caseId, fileIds }: BulkDeleteFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    user,
    services: { attachmentService, userActionService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkDeleteFileAttachmentsRequestRt)({ ids: fileIds });

    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const fileEntities = await getFileEntities({
      caseId,
      fileIds: request.ids,
      fileService,
      logger,
    });

    // It's possible for this to return an empty array if there was an error creating file attachments in which case the
    // file would be present but the case attachment would not
    const fileAttachments = await attachmentService.getter.getFileAttachments({
      caseId,
      fileIds: request.ids,
    });

    await authorization.ensureAuthorized({
      entities: [
        ...fileAttachments.map((attachment) => ({
          id: attachment.id,
          owner: attachment.attributes.owner,
        })),
        ...fileEntities,
      ],
      operation: Operations.deleteComment,
    });

    await Promise.all([
      deleteFiles(
        fileEntities.map((entity) => entity.id),
        fileService
      ),
      attachmentService.bulkDelete({
        attachmentIds: fileAttachments.map((so) => so.id),
        refresh: false,
      }),
    ]);

    await userActionService.creator.bulkCreateAttachmentDeletion({
      caseId,
      attachments: fileAttachments.map((attachment) => ({
        id: attachment.id,
        owner: attachment.attributes.owner,
        attachment: attachment.attributes,
      })),
      user,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const getFileEntities = async ({
  caseId,
  fileIds,
  fileService,
  logger,
}: {
  caseId: BulkDeleteFileArgs['caseId'];
  fileIds: BulkDeleteFileArgs['fileIds'];
  fileService: FileServiceStart;
  logger: Logger;
}) => {
  const files = await getFiles({ caseId, fileIds, fileService, logger });

  const fileEntities = createFileEntities(files);

  return fileEntities;
};

const getFiles = async ({
  caseId,
  fileIds,
  fileService,
  logger,
}: {
  caseId: BulkDeleteFileArgs['caseId'];
  fileIds: BulkDeleteFileArgs['fileIds'];
  fileService: FileServiceStart;
  logger: Logger;
}): Promise<FileJSON[]> => {
  // it's possible that we're trying to delete a file when an attachment wasn't created (for example if the create
  // attachment request failed)
  const fileSettleResults = await pSettle(
    fileIds.map(async (fileId) => fileService.getById({ id: fileId })),
    {
      concurrency: MAX_CONCURRENT_SEARCHES,
    }
  );

  const files = retrieveFilesIgnoringNotFound(fileSettleResults, fileIds, logger);

  const [validFiles, invalidFiles] = partition(files, (file) => {
    return (
      CaseFileMetadataForDeletionRt.is(file.data.meta) &&
      file.data.meta.caseIds.length === 1 &&
      file.data.meta.caseIds.includes(caseId)
    );
  }) as [File[], File[]];

  if (invalidFiles.length > 0) {
    const invalidIds = invalidFiles.map((fileInfo) => fileInfo.id);

    // I'm intentionally being vague here because it's possible an unauthorized user could attempt to delete files
    throw Boom.badRequest(`Failed to delete files because filed ids were invalid: ${invalidIds}`);
  }

  return validFiles.map((fileInfo) => fileInfo.data);
};

export const retrieveFilesIgnoringNotFound = (
  results: Array<PromiseResult<File<unknown>>>,
  fileIds: BulkDeleteFileArgs['fileIds'],
  logger: Logger
) => {
  const files: File[] = [];

  results.forEach((result, index) => {
    if (result.isFulfilled) {
      files.push(result.value);
    } else if (result.reason instanceof FileNotFoundError) {
      const warningMessage = getFileNotFoundErrorMessage({
        resultsLength: results.length,
        fileIds,
        index,
        result,
      });

      logger.warn(warningMessage);
    } else if (result.reason instanceof Error) {
      throw result.reason;
    } else {
      throw new Error(`Failed to retrieve file id: ${fileIds[index]}: ${result.reason}`);
    }
  });

  return files;
};

const getFileNotFoundErrorMessage = ({
  resultsLength,
  fileIds,
  index,
  result,
}: {
  resultsLength: number;
  fileIds: BulkDeleteFileArgs['fileIds'];
  index: number;
  result: PromiseRejectedResult;
}) => {
  if (resultsLength === fileIds.length) {
    return `Failed to find file id: ${fileIds[index]}: ${result.reason}`;
  }

  return `Failed to find file: ${result.reason}`;
};
