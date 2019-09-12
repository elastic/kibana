/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import querystring from 'querystring';
import { Action, handleActions } from 'redux-actions';
import { history } from '../utils/url';

import {
  DocumentSearchResult,
  RepositoryUri,
  SearchOptions,
  SearchScope,
  RepositorySearchResult,
  Repository,
} from '../../model';
import {
  changeSearchScope,
  documentSearch as documentSearchQuery,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
  repositorySearch as repositorySearchAction,
  repositorySearchFailed,
  RepositorySearchPayload,
  repositorySearchSuccess,
  saveSearchOptions,
  searchReposForScope,
  searchReposForScopeSuccess,
  suggestionSearch,
  turnOffDefaultRepoScope,
  turnOnDefaultRepoScope,
} from '../actions';
import { RepositoryUtils } from '../../common/repository_utils';

export interface SearchState {
  scope: SearchScope;
  query: string;
  page?: number;
  languages?: Set<string>;
  repositories?: Set<RepositoryUri>;
  isLoading: boolean;
  isScopeSearchLoading: boolean;
  error?: Error;
  documentSearchResults?: DocumentSearchResult;
  repositorySearchResults?: any;
  searchOptions: SearchOptions;
  scopeSearchResults: RepositorySearchResult;
}

const repositories: Repository[] = [];

const getRepoScopeFromUrl = () => {
  const { repoScope } = querystring.parse(history.location.search.replace('?', ''));
  if (repoScope) {
    return String(repoScope)
      .split(',')
      .map(r => ({
        uri: r,
        org: RepositoryUtils.orgNameFromUri(r),
        name: RepositoryUtils.repoNameFromUri(r),
      })) as Repository[];
  } else {
    return [];
  }
};

const initialState: SearchState = {
  query: '',
  isLoading: false,
  isScopeSearchLoading: false,
  scope: SearchScope.DEFAULT,
  searchOptions: {
    repoScope: getRepoScopeFromUrl(),
    defaultRepoScopeOn: false,
  },
  scopeSearchResults: { repositories, total: 0, took: 0 },
};

type SearchPayload = DocumentSearchPayload &
  DocumentSearchResult &
  Error &
  string &
  SearchScope &
  SearchOptions &
  Repository &
  RepositorySearchResult;

export const search = handleActions<SearchState, SearchPayload>(
  {
    [String(changeSearchScope)]: (state: SearchState, action: Action<SearchScope>) =>
      produce<SearchState>(state, draft => {
        if (Object.values(SearchScope).includes(action.payload)) {
          draft.scope = action.payload!;
        } else {
          draft.scope = SearchScope.DEFAULT;
        }
        draft.isLoading = false;
      }),
    [String(documentSearchQuery)]: (state: SearchState, action: Action<DocumentSearchPayload>) =>
      produce<SearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload.query;
          draft.page = parseInt(action.payload.page as string, 10);
          if (action.payload.languages) {
            draft.languages = new Set(decodeURIComponent(action.payload.languages).split(','));
          } else {
            draft.languages = new Set();
          }
          if (action.payload.repositories) {
            draft.repositories = new Set(
              decodeURIComponent(action.payload.repositories).split(',')
            );
          } else {
            draft.repositories = new Set();
          }
          draft.isLoading = true;
          delete draft.error;
        }
      }),
    [String(documentSearchSuccess)]: (state: SearchState, action: Action<DocumentSearchResult>) =>
      produce<SearchState>(state, (draft: SearchState) => {
        const {
          from,
          page,
          totalPage,
          results,
          total,
          repoAggregations,
          langAggregations,
          took,
        } = action.payload!;
        draft.isLoading = false;

        const repoStats = repoAggregations!.map(agg => {
          return {
            name: agg.key,
            value: agg.doc_count,
          };
        });

        const languageStats = langAggregations!.map(agg => {
          return {
            name: agg.key,
            value: agg.doc_count,
          };
        });

        draft.documentSearchResults = {
          ...draft.documentSearchResults,
          query: state.query,
          total,
          took,
          stats: {
            total,
            from: from as number,
            to: from! + results!.length,
            page: page!,
            totalPage: totalPage!,
            repoStats,
            languageStats,
          },
          results,
        };
      }),
    [String(documentSearchFailed)]: (state: SearchState, action: Action<Error>) => {
      if (action.payload) {
        return produce<SearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload!;
        });
      } else {
        return state;
      }
    },
    [String(suggestionSearch)]: (state: SearchState, action: Action<string>) =>
      produce<SearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload;
        }
      }),
    [String(repositorySearchAction)]: (
      state: SearchState,
      action: Action<RepositorySearchPayload>
    ) =>
      produce<SearchState>(state, draft => {
        if (action.payload) {
          draft.query = action.payload.query;
          draft.isLoading = true;
          delete draft.error;
          delete draft.repositorySearchResults;
        }
      }),
    [String(repositorySearchSuccess)]: (
      state: SearchState,
      action: Action<RepositorySearchResult>
    ) =>
      produce<SearchState>(state, draft => {
        draft.repositorySearchResults = action.payload;
        draft.isLoading = false;
      }),
    [String(repositorySearchFailed)]: (state: SearchState, action: Action<Error>) => {
      if (action.payload) {
        return produce<SearchState>(state, draft => {
          draft.isLoading = false;
          draft.error = action.payload;
        });
      } else {
        return state;
      }
    },
    [String(saveSearchOptions)]: (state: SearchState, action: Action<SearchOptions>) =>
      produce<SearchState>(state, draft => {
        draft.searchOptions = action.payload!;
      }),
    [String(searchReposForScope)]: (state: SearchState, action: Action<RepositorySearchPayload>) =>
      produce<SearchState>(state, draft => {
        draft.isScopeSearchLoading = true;
      }),
    [String(searchReposForScopeSuccess)]: (
      state: SearchState,
      action: Action<RepositorySearchResult>
    ) =>
      produce<SearchState>(state, draft => {
        draft.scopeSearchResults = action.payload!;
        draft.isScopeSearchLoading = false;
      }),
    [String(turnOnDefaultRepoScope)]: (state: SearchState, action: Action<Repository>) =>
      produce<SearchState>(state, draft => {
        draft.searchOptions.defaultRepoScope = action.payload;
        draft.searchOptions.defaultRepoScopeOn = true;
      }),
    [String(turnOffDefaultRepoScope)]: (state: SearchState) =>
      produce<SearchState>(state, draft => {
        delete draft.searchOptions.defaultRepoScope;
        draft.searchOptions.defaultRepoScopeOn = false;
      }),
  },
  initialState
);
