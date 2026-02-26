/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClientArgs } from '../types';

/**
 * Returns the owner of a case. Used when resolving owner for unified (v2) attachments
 * that do not include owner in the request payload.
 */
export const getCaseOwner = async (
  caseId: string,
  clientArgs: CasesClientArgs
): Promise<string> => {
  const theCase = await clientArgs.services.caseService.getCase({ id: caseId });
  return theCase.attributes.owner;
};
