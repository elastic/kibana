/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionHandlerResponse } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import type { GetAllForOwnersArgs } from './types';
import { getAllForOwners } from './get';

/**
 * API for interacting with attachment suggestions.
 */
export interface AttachmentSuggestionsSubClient {
  getAllForOwners(getAllForOwnersArgs: GetAllForOwnersArgs): Promise<SuggestionHandlerResponse>;
}

/**
 * Creates an API object for interacting with suggestions.
 *
 * @ignore
 */
export const createAttachmentSuggestionsSubClient = (
  clientArgs: CasesClientArgs
): AttachmentSuggestionsSubClient => {
  const suggestionsSubClient: AttachmentSuggestionsSubClient = {
    getAllForOwners: (params: GetAllForOwnersArgs) => getAllForOwners(params, clientArgs),
  };

  return Object.freeze(suggestionsSubClient);
};
