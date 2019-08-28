/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import {
  AbstractSuggestionsProvider,
  AutocompleteSuggestionGroup,
  AutocompleteSuggestionType,
} from '.';
import { toRepoNameWithOrg } from '../../../../common/uri_util';
import { SearchResultItem, SearchScope } from '../../../../model';

export class FileSuggestionsProvider extends AbstractSuggestionsProvider {
  protected matchSearchScope(scope: SearchScope): boolean {
    return scope === SearchScope.DEFAULT || scope === SearchScope.FILE;
  }

  protected async fetchSuggestions(
    query: string,
    repoScope?: string[]
  ): Promise<AutocompleteSuggestionGroup> {
    try {
      const queryParams: { q: string; repoScope?: string[] } = { q: query, repoScope };
      // actually, query accepts string[] as value's  type
      // @ts-ignore
      const res = await npStart.core.http.get(`/api/code/suggestions/doc`, {
        query: queryParams,
      });
      const suggestions = Array.from(res.results as SearchResultItem[])
        .slice(0, this.MAX_SUGGESTIONS_PER_GROUP)
        .map((doc: SearchResultItem) => {
          return {
            description: toRepoNameWithOrg(doc.uri),
            end: 10,
            start: 1,
            text: doc.filePath,
            tokenType: '',
            selectUrl: `/${doc.uri}/blob/HEAD/${doc.filePath}`,
          };
        });
      return {
        type: AutocompleteSuggestionType.FILE,
        total: res.total,
        hasMore: res.total > this.MAX_SUGGESTIONS_PER_GROUP,
        suggestions,
      };
    } catch (error) {
      return {
        type: AutocompleteSuggestionType.FILE,
        total: 0,
        hasMore: false,
        suggestions: [],
      };
    }
  }
}
