/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from '../types';
import { createCasesClient } from '..';
import type { Case } from '../../../common/types/domain';

export const getCaseOwner = async (caseId: string, clientArgs: CasesClientArgs) => {
  const casesClient = createCasesClient(clientArgs);
  const caseOwner = await casesClient.cases
    .get({
      id: caseId,
      includeComments: false,
    })
    .then((c: Case) => c.owner);
  return caseOwner;
};
