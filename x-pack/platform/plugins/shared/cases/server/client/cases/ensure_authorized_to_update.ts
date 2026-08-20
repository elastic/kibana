/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '../types';

export interface EnsureAuthorizedToUpdateParams {
  id: string;
}

export const ensureAuthorizedToUpdate = async (
  { id }: EnsureAuthorizedToUpdateParams,
  clientArgs: CasesClientArgs
): Promise<void> => {
  const {
    authorization,
    logger,
    services: { caseService },
  } = clientArgs;

  try {
    const theCase = await caseService.getCase({ id });
    await authorization.ensureAuthorized({
      operation: Operations.updateCase,
      entities: [{ id: theCase.id, owner: theCase.attributes.owner }],
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to authorize update for case id: ${id}: ${error}`,
      error,
      logger,
    });
  }
};
