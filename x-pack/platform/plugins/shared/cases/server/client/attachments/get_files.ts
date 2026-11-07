/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { Owner } from '../../../common/constants/types';
import { constructFileKindIdByOwner } from '../../../common/files';
import { Operations } from '../../authorization';
import { createCaseEntity } from '../../authorization/utils';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '../types';
import type { GetFilesArgs } from './types';

export interface GetFilesResponse {
  files: FileJSON[];
  total: number;
}

/**
 * Lists the files of a case after authorizing the case itself. Replaces the
 * files plugin's per-kind list route for case files, which could list every
 * case file in the space without proving access to any case.
 */
export const getFiles = async (
  { caseId, page, perPage, searchTerm }: GetFilesArgs,
  clientArgs: CasesClientArgs
): Promise<GetFilesResponse> => {
  const {
    services: { caseService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  try {
    const theCase = await caseService.getCase({ id: caseId });

    await authorization.ensureAuthorized({
      operation: Operations.getCase,
      entities: [createCaseEntity(theCase)],
    });

    const { files, total } = await fileService.find({
      kind: [constructFileKindIdByOwner(theCase.attributes.owner as Owner)],
      page,
      perPage,
      ...(searchTerm !== undefined ? { name: [`*${searchTerm}*`] } : {}),
      meta: { caseIds: [caseId] },
    });

    return { files, total };
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve files for case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
