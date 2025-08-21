/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuggestionHandlerResponse } from '../../../common/types/domain';

import type { CasesClientArgs } from '../types';

import type { GetAllForOwnerArgs } from './types';

/**
 * Retrieves all the suggestions for the specified owners.
 */
export async function getAllForOwner(
  { owner, context, request }: GetAllForOwnerArgs,
  clientArgs: CasesClientArgs
): Promise<SuggestionHandlerResponse> {
  const { attachmentSuggestionRegistry } = clientArgs;

  const suggestions = await attachmentSuggestionRegistry.getAllSuggestionsForOwner(
    owner,
    context,
    request,
    clientArgs.logger
  );

  return suggestions;
}
