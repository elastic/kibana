/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import chrome from 'ui/chrome';
import { kfetch } from 'ui/kfetch';
import Url from 'url';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';

import {
  fetchDirectory,
  fetchDirectoryFailed,
  fetchDirectorySuccess,
  fetchFile,
  fetchFileFailed,
  FetchFilePayload,
  FetchFileResponse,
  fetchFileSuccess,
  fetchMoreCommits,
  fetchRepoBranches,
  fetchRepoBranchesFailed,
  fetchRepoBranchesSuccess,
  fetchRepoCommits,
  fetchRepoCommitsFailed,
  fetchRepoCommitsSuccess,
  FetchRepoPayload,
  FetchRepoPayloadWithRevision,
  fetchRepoTree,
  fetchRepoTreeFailed,
  FetchRepoTreePayload,
  fetchRepoTreeSuccess,
  fetchTreeCommits,
  fetchTreeCommitsFailed,
  fetchTreeCommitsSuccess,
  gotoRepo,
  Match,
  setNotFound,
  fetchRootRepoTree,
  fetchRootRepoTreeSuccess,
  fetchRootRepoTreeFailed,
  dirNotFound,
} from '../actions';
import { treeCommitsSelector, currentPathSelector } from '../selectors';
import { repoRoutePattern } from './patterns';
import { FileTree } from '../../model';

function* handleFetchRepoTree(action: Action<FetchRepoTreePayload>) {
  try {
    const tree = yield call(requestRepoTree, action.payload!);
    (tree.children || []).sort((a: FileTree, b: FileTree) => {
      const typeDiff = a.type - b.type;
      if (typeDiff === 0) {
        return a.name > b.name ? 1 : -1;
      } else {
        return -typeDiff;
      }
    });
    tree.repoUri = action.payload!.uri;
    yield put(
      fetchRepoTreeSuccess({
        tree,
        path: action.payload!.path,
        withParents: action.payload!.parents,
      })
    );
  } catch (err) {
    if (action.payload!.isDir && err.body && err.body.statusCode === 404) {
      yield put(dirNotFound(action.payload!.path));
    }
    yield put(fetchRepoTreeFailed({ ...err, path: action.payload!.path }));
  }
}

interface FileTreeQuery {
  parents?: boolean;
  limit: number;
  flatten: boolean;
  [key: string]: string | number | boolean | undefined;
}

function requestRepoTree({
  uri,
  revision,
  path,
  limit = 1000,
  parents = false,
}: FetchRepoTreePayload) {
  const query: FileTreeQuery = { limit, flatten: true };
  if (parents) {
    query.parents = true;
  }
  return kfetch({
    pathname: `/api/code/repo/${uri}/tree/${encodeURIComponent(revision)}/${path}`,
    query,
  });
}

export function* watchFetchRepoTree() {
  yield takeEvery(String(fetchRepoTree), handleFetchRepoTree);
}

function* handleFetchRootRepoTree(action: Action<FetchRepoPayloadWithRevision>) {
  try {
    const { uri, revision } = action.payload!;
    const tree = yield call(requestRepoTree, { uri, revision, path: '', isDir: true });
    yield put(fetchRootRepoTreeSuccess(tree));
  } catch (err) {
    yield put(fetchRootRepoTreeFailed(err));
  }
}

export function* watchFetchRootRepoTree() {
  yield takeEvery(String(fetchRootRepoTree), handleFetchRootRepoTree);
}

function* handleFetchBranches(action: Action<FetchRepoPayload>) {
  try {
    const results = yield call(requestBranches, action.payload!);
    yield put(fetchRepoBranchesSuccess(results));
  } catch (err) {
    yield put(fetchRepoBranchesFailed(err));
  }
}

function requestBranches({ uri }: FetchRepoPayload) {
  return kfetch({
    pathname: `/api/code/repo/${uri}/references`,
  });
}

function* handleFetchCommits(action: Action<FetchRepoPayloadWithRevision>) {
  try {
    const results = yield call(requestCommits, action.payload!);
    yield put(fetchRepoCommitsSuccess(results));
  } catch (err) {
    yield put(fetchRepoCommitsFailed(err));
  }
}

function* handleFetchMoreCommits(action: Action<string>) {
  try {
    const path = yield select(currentPathSelector);
    const commits = yield select(treeCommitsSelector);
    const revision = commits.length > 0 ? commits[commits.length - 1].id : 'head';
    const uri = action.payload;
    // @ts-ignore
    const newCommits = yield call(requestCommits, { uri, revision }, path, true);
    yield put(fetchTreeCommitsSuccess({ path, commits: newCommits, append: true }));
  } catch (err) {
    yield put(fetchTreeCommitsFailed(err));
  }
}

function* handleFetchTreeCommits(action: Action<FetchFilePayload>) {
  try {
    const path = action.payload!.path;
    const commits = yield call(requestCommits, action.payload!, path);
    yield put(fetchTreeCommitsSuccess({ path, commits }));
  } catch (err) {
    yield put(fetchTreeCommitsFailed(err));
  }
}

function requestCommits(
  { uri, revision }: FetchRepoPayloadWithRevision,
  path?: string,
  loadMore?: boolean,
  count?: number
) {
  const pathStr = path ? `/${path}` : '';
  const options: any = {
    pathname: `/api/code/repo/${uri}/history/${encodeURIComponent(revision)}${pathStr}`,
  };
  if (loadMore) {
    options.query = { after: 1 };
  }
  if (count) {
    options.count = count;
  }
  return kfetch(options);
}

export async function requestFile(
  payload: FetchFilePayload,
  line?: string
): Promise<FetchFileResponse> {
  const { uri, revision, path } = payload;
  const url = `/api/code/repo/${uri}/blob/${encodeURIComponent(revision)}/${path}`;
  const query: any = {};
  if (line) {
    query.line = line;
  }
  const response: Response = await fetch(chrome.addBasePath(Url.format({ pathname: url, query })));

  if (response.status >= 200 && response.status < 300) {
    const contentType = response.headers.get('Content-Type');

    if (contentType && contentType.startsWith('text/')) {
      const lang = contentType.split(';')[0].substring('text/'.length);
      if (lang === 'big') {
        return {
          payload,
          content: '',
          isOversize: true,
        };
      }
      return {
        payload,
        lang,
        content: await response.text(),
        isUnsupported: false,
      };
    } else if (contentType && contentType.startsWith('image/')) {
      return {
        payload,
        isImage: true,
        content: '',
        url,
        isUnsupported: false,
      };
    } else {
      return {
        payload,
        isImage: false,
        content: '',
        url,
        isUnsupported: true,
      };
    }
  } else if (response.status === 404) {
    return {
      payload,
      isNotFound: true,
    };
  }
  throw new Error('invalid file type');
}

function* handleFetchFile(action: Action<FetchFilePayload>) {
  try {
    const results = yield call(requestFile, action.payload!);
    if (results.isNotFound) {
      yield put(setNotFound(true));
      yield put(fetchFileFailed(new Error('file not found')));
    } else {
      yield put(fetchFileSuccess(results));
    }
  } catch (err) {
    yield put(fetchFileFailed(err));
  }
}

function* handleFetchDirs(action: Action<FetchRepoTreePayload>) {
  try {
    const dir = yield call(requestRepoTree, action.payload!);
    yield put(fetchDirectorySuccess(dir));
  } catch (err) {
    yield fetchDirectoryFailed(err);
  }
}

export function* watchFetchBranchesAndCommits() {
  yield takeEvery(String(fetchRepoBranches), handleFetchBranches);
  yield takeEvery(String(fetchRepoCommits), handleFetchCommits);
  yield takeLatest(String(fetchFile), handleFetchFile);
  yield takeEvery(String(fetchDirectory), handleFetchDirs);
  yield takeLatest(String(fetchTreeCommits), handleFetchTreeCommits);
  yield takeLatest(String(fetchMoreCommits), handleFetchMoreCommits);
}

function* handleRepoRouteChange(action: Action<Match>) {
  const { repo, org, resource } = action.payload!.params;
  const uri = `${resource}/${org}/${repo}`;
  yield put(gotoRepo(uri));
}

export function* watchRepoRouteChange() {
  yield takeEvery(repoRoutePattern, handleRepoRouteChange);
}
