/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionHandlerResponse } from '../../../common/types/domain';
import type { CasesClientArgs } from '../types';
import type { GetAllForOwnerArgs } from './types';
import { getAllForOwner } from './get';

/**
 * API for interacting with attachment suggestions.
 */
export interface AttachmentSuggestionsSubClient {
  getAllForOwner(getAllForOwnerArgs: GetAllForOwnerArgs): Promise<SuggestionHandlerResponse>;
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
    getAllForOwner: (params: GetAllForOwnerArgs) => getAllForOwner(params, clientArgs),
  };

  return Object.freeze(suggestionsSubClient);
};
