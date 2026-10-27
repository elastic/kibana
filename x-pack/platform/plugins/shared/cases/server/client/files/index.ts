/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { partition } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { File, FileJSON } from '@kbn/files-plugin/common';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import pMap from 'p-map';
import {
  CaseFileMetadataForDeletionSchema,
  constructOwnerFromFileKind,
} from '../../../common/files';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import type { OwnerEntity } from '../../authorization';

type FileEntityInfo = Pick<FileJSON, 'fileKind' | 'id'>;

export const createFileEntities = (files: FileEntityInfo[]): OwnerEntity[] => {
  const fileEntities: OwnerEntity[] = [];

  // It's possible that the owner array could have invalid information in it so we'll use the file kind for determining if the user
  // has the correct authorization for deleting these files
  for (const fileInfo of files) {
    const ownerFromFileKind = constructOwnerFromFileKind(fileInfo.fileKind);

    if (ownerFromFileKind == null) {
      throw Boom.badRequest(`File id ${fileInfo.id} has invalid file kind ${fileInfo.fileKind}`);
    }

    fileEntities.push({ id: fileInfo.id, owner: ownerFromFileKind });
  }

  return fileEntities;
};

export const deleteFiles = async (fileIds: string[], fileService: FileServiceStart) => {
  if (fileIds.length <= 0) {
    return;
  }

  return pMap(fileIds, async (fileId: string) => fileService.delete({ id: fileId }), {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });
};

interface GetFileEntitiesForCaseArgs {
  caseId: string;
  fileIds: string[];
  fileService: FileServiceStart;
  logger: Logger;
  /** Leaves out files that cannot be deleted with the case, instead of rejecting the request. */
  skipInvalid?: boolean;
}

/** Returns the authorization entities of the files that belong only to the case. */
export const getFileEntitiesForCase = async ({
  caseId,
  fileIds,
  fileService,
  logger,
  skipInvalid = false,
}: GetFileEntitiesForCaseArgs): Promise<OwnerEntity[]> => {
  // Files that no longer exist are left out.
  const files = await getFiles({ fileIds, fileService, logger });

  const [validFiles, invalidFiles] = partition(files, (file) => {
    const parsed = CaseFileMetadataForDeletionSchema.safeParse(file.data.meta);
    return (
      parsed.success &&
      parsed.data.caseIds.length === 1 &&
      parsed.data.caseIds.includes(caseId) &&
      (!skipInvalid || constructOwnerFromFileKind(file.data.fileKind) != null)
    );
  }) as [File[], File[]];

  if (invalidFiles.length > 0) {
    const invalidIds = invalidFiles.map((fileInfo) => fileInfo.id);

    if (!skipInvalid) {
      // I'm intentionally being vague here because it's possible an unauthorized user could attempt to delete files
      throw Boom.badRequest(`Failed to delete files because file ids were invalid: ${invalidIds}`);
    }

    logger.warn(
      `Files ${invalidIds} are kept because they are linked to another case or have invalid metadata.`
    );
  }

  return createFileEntities(validFiles.map((fileInfo) => fileInfo.data));
};

const getFiles = async ({
  fileIds,
  fileService,
  logger,
}: Pick<GetFileEntitiesForCaseArgs, 'fileIds' | 'fileService' | 'logger'>): Promise<File[]> => {
  // it's possible that we're trying to delete a file when an attachment wasn't created (for example if the create
  // attachment request failed)
  const fileSettleResults = await pMap(
    fileIds,
    async (fileId) => {
      try {
        return await fileService.getById({ id: fileId });
      } catch (error) {
        return error;
      }
    },
    {
      concurrency: MAX_CONCURRENT_SEARCHES,
    }
  );

  return retrieveFilesIgnoringNotFound(fileSettleResults, fileIds, logger);
};

export const retrieveFilesIgnoringNotFound = (
  results: Array<File<unknown> | Error>,
  fileIds: string[],
  logger: Logger
) => {
  const files: File[] = [];

  results.forEach((result, index) => {
    if (result instanceof FileNotFoundError) {
      const warningMessage = getFileNotFoundErrorMessage({
        resultsLength: results.length,
        fileIds,
        index,
        result,
      });

      logger.warn(warningMessage);
    } else if (result instanceof Error) {
      throw result;
    } else if (result) {
      files.push(result);
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
  fileIds: string[];
  index: number;
  result: Error;
}) => {
  if (resultsLength === fileIds.length) {
    return `Failed to find file id: ${fileIds[index]}: ${result}`;
  }

  return `Failed to find file: ${result}`;
};
