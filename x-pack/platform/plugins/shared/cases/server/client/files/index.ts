/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { FileJSON } from '@kbn/files-plugin/common';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import pMap from 'p-map';
import { constructOwnerFromFileKind } from '../../../common/files';
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
