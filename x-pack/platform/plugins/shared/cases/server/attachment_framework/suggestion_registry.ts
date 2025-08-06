/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';
import { Registry } from '../../common/registry';
import type {
  SuggestionContext,
  SuggestionOwner,
  SuggestionResponse,
} from '../../common/types/domain';
import type { SuggestionType } from './types';

export class AttachmentSuggestionRegistry extends Registry<SuggestionType> {
  constructor() {
    super('AttachmentSuggestionRegistry');
  }

  public register(suggestionType: SuggestionType): void {
    super.register(suggestionType);
  }

  public getAll(): SuggestionType[] {
    return super.list();
  }

  public getAllForOwners(owners: SuggestionOwner[]): SuggestionType[] {
    return this.list().filter((suggestion) => owners.includes(suggestion.owner));
  }

  public async getAllSuggestionsForOwners(
    owners: SuggestionOwner[],
    context: SuggestionContext
  ): Promise<SuggestionResponse> {
    const allSuggestionDefinitions = this.getAllForOwners(owners);
    const allSuggestionHandlers = flatten(
      allSuggestionDefinitions.map((suggestion) => {
        return Object.values(suggestion.handlers);
      })
    );
    const allSettledResponses = await Promise.allSettled(
      allSuggestionHandlers.map((handler) => {
        return handler(context);
      })
    );

    const fulfilledResponses = allSettledResponses
      .filter((result): result is PromiseFulfilledResult<SuggestionResponse> => result.status === 'fulfilled')
      .map((result) => result.value);

    return fulfilledResponses.reduce<SuggestionResponse>(
      (acc, response) => {
        return {
          ...acc,
          ...response,
          suggestions: [...(acc.suggestions || []), ...(response.suggestions || [])],
        };
      },
      { suggestions: [] }
    );
  }
}
