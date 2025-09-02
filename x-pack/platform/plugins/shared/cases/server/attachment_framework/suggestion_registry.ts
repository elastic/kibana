/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest } from '@kbn/core/server';
import { AttachmentRegistry } from '../../common/registry';
import type {
  SuggestionContext,
  SuggestionOwner,
  SuggestionHandlerResponse,
} from '../../common/types/domain';
import type { SuggestionType } from './types';

export class AttachmentSuggestionRegistry extends AttachmentRegistry<SuggestionType> {
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
    context: SuggestionContext,
    request: KibanaRequest,
    logger: Logger
  ): Promise<SuggestionHandlerResponse> {
    const promises: Array<Promise<SuggestionHandlerResponse>> = [];
    for (const suggestion of this.getAllForOwners(owners)) {
      for (const handlerDefinition of Object.values(suggestion.handlers)) {
        promises.push(
          handlerDefinition.handler({
            request,
            context,
          })
        );
      }
    }
    const allSettledResponses = await Promise.allSettled(promises);

    return allSettledResponses.reduce<SuggestionHandlerResponse>(
      (acc, r) => {
        if (r.status === 'rejected') {
          logger.error('Failed to get suggestion.', { error: r.reason });
        }
        if (r.status === 'fulfilled') {
          const items = r.value.suggestions;
          if (items.length) acc.suggestions.push(...items);
        }
        return acc;
      },
      { suggestions: [] }
    );
  }
}
