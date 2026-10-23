/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { CasesClientArgs } from '../types';
import type { GetCaseWithAttachmentsArgs } from './types';

/**
 * Reads a case with all its attachments, in the shape the legacy routes and workflow steps return.
 */
export const getCaseWithAttachments = async (
  { caseId, writeOperation }: GetCaseWithAttachmentsArgs,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const { authorization, logger } = clientArgs;

  try {
    const model = await CaseCommentModel.create(caseId, clientArgs);
    const {
      id,
      attributes: { owner },
    } = model.savedObject;

    await authorization.ensureAuthorized({
      operation:
        writeOperation === 'update'
          ? Operations.getCaseAfterUpdateComment
          : Operations.getCaseAfterCreateComment,
      entities: [{ owner, id }],
    });

    return await model.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed to get case with attachments, case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
