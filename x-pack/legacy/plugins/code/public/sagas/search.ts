/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import queryString from 'querystring';
import { kfetch } from 'ui/kfetch';

import { Action } from 'redux-actions';
import { call, put, takeEvery, takeLatest } from 'redux-saga/effects';

import { SearchScope } from '../../model';
import {
  changeSearchScope,
  documentSearch,
  documentSearchFailed,
  DocumentSearchPayload,
  documentSearchSuccess,
  Match,
  repositorySearch,
  repositorySearchFailed,
  RepositorySearchPayload,
  repositorySearchQueryChanged,
  repositorySearchSuccess,
  searchReposForScope,
  searchReposForScopeFailed,
  searchReposForScopeSuccess,
  turnOffDefaultRepoScope,
} from '../actions';
import { adminRoutePattern, searchRoutePattern } from './patterns';

function requestDocumentSearch(payload: DocumentSearchPayload) {
  const { query, page, languages, repositories, repoScope } = payload;
  const queryParams: { [key: string]: string | number | boolean } = {
    q: query,
  };

  if (page) {
    queryParams.p = page;
  }

  if (languages) {
    queryParams.langs = languages;
  }

  if (repositories) {
    queryParams.repos = repositories;
  }

  if (repoScope) {
    queryParams.repoScope = repoScope;
  }

  if (query && query.length > 0) {
    return kfetch({
      pathname: `/api/code/search/doc`,
      method: 'get',
      query: queryParams,
    });
  } else {
    return {
      documents: [],
      took: 0,
      total: 0,
    };
  }
}

function* handleDocumentSearch(action: Action<DocumentSearchPayload>) {
  try {
    const data = yield call(requestDocumentSearch, action.payload!);
    yield put(documentSearchSuccess(data));
  } catch (err) {
    yield put(documentSearchFailed(err));
  }
}

function requestRepositorySearch(q: string) {
  return kfetch({
    pathname: `/api/code/search/repo`,
    method: 'get',
    query: { q },
  });
}

export function* watchDocumentSearch() {
  yield takeLatest(String(documentSearch), handleDocumentSearch);
}

function* handleRepositorySearch(action: Action<RepositorySearchPayload>) {
  try {
    const data = yield call(requestRepositorySearch, action.payload!.query);
    yield put(repositorySearchSuccess(data));
  } catch (err) {
    yield put(repositorySearchFailed(err));
  }
}

export function* watchRepositorySearch() {
  yield takeLatest(
    [String(repositorySearch), String(repositorySearchQueryChanged)],
    handleRepositorySearch
  );
}

function* handleSearchRouteChange(action: Action<Match>) {
  const { location } = action.payload!;
  const rawSearchStr = location.search.length > 0 ? location.search.substring(1) : '';
  const queryParams = queryString.parse(rawSearchStr);
  const { q, p, langs, repos, scope, repoScope } = queryParams;
  yield put(changeSearchScope(scope as SearchScope));
  if (scope === SearchScope.REPOSITORY) {
    yield put(repositorySearch({ query: q as string }));
  } else {
    yield put(
      documentSearch({
        query: q as string,
        page: p as string,
        languages: langs as string,
        repositories: repos as string,
        repoScope: repoScope as string,
      })
    );
  }
}

function* resetDefaultRepoScope() {
  yield put(turnOffDefaultRepoScope());
}

export function* watchSearchRouteChange() {
  yield takeLatest(searchRoutePattern, handleSearchRouteChange);
  // Reset the default search scope if enters the admin page.
  yield takeLatest(adminRoutePattern, resetDefaultRepoScope);
}

function* handleReposSearchForScope(action: Action<RepositorySearchPayload>) {
  try {
    const data = yield call(requestRepositorySearch, action.payload!.query);
    yield put(searchReposForScopeSuccess(data));
  } catch (err) {
    yield put(searchReposForScopeFailed(err));
  }
}

export function* watchRepoScopeSearch() {
  yield takeEvery(searchReposForScope, handleReposSearchForScope);
}
