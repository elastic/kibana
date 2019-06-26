/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import queryString from 'querystring';
import { Action } from 'redux-actions';
import { kfetch } from 'ui/kfetch';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import Url from 'url';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { parseGoto, parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import { FileTree } from '../../model';
import {
  closeReferences,
  fetchFile,
  FetchFileResponse,
  fetchRepoBranches,
  fetchRepoCommits,
  fetchRepoTree,
  fetchTreeCommits,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  loadStructure,
  Match,
  resetRepoTree,
  revealPosition,
  fetchRepos,
  turnOnDefaultRepoScope,
  openTreePath,
  fetchRootRepoTree,
} from '../actions';
import { loadRepo, loadRepoFailed, loadRepoSuccess } from '../actions/status';
import { PathTypes } from '../common/types';
import { RootState } from '../reducers';
import { getPathOfTree } from '../reducers/file';
import {
  fileSelector,
  getTree,
  lastRequestPathSelector,
  refUrlSelector,
  repoScopeSelector,
  urlQueryStringSelector,
  createTreeSelector,
} from '../selectors';
import { history } from '../utils/url';
import { mainRoutePattern } from './patterns';

function* handleReferences(action: Action<TextDocumentPositionParams>) {
  try {
    const params: TextDocumentPositionParams = action.payload!;
    const { title, files } = yield call(requestFindReferences, params);
    const repos = Object.keys(files).map((repo: string) => ({ repo, files: files[repo] }));
    yield put(findReferencesSuccess({ title, repos }));
  } catch (error) {
    yield put(findReferencesFailed(error));
  }
}

function requestFindReferences(params: TextDocumentPositionParams) {
  return kfetch({
    pathname: `/api/code/lsp/findReferences`,
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function* watchLspMethods() {
  yield takeLatest(String(findReferences), handleReferences);
}

function* handleCloseReferences(action: Action<boolean>) {
  if (action.payload) {
    const search = yield select(urlQueryStringSelector);
    const { pathname } = history.location;
    const queryParams = Url.parse(search, true).query;
    if (queryParams.tab) {
      delete queryParams.tab;
    }
    if (queryParams.refUrl) {
      delete queryParams.refUrl;
    }
    const query = queryString.stringify(queryParams);
    if (query) {
      history.push(`${pathname}?${query}`);
    } else {
      history.push(pathname);
    }
  }
}

export function* watchCloseReference() {
  yield takeLatest(String(closeReferences), handleCloseReferences);
}

function* handleReference(url: string) {
  const refUrl = yield select(refUrlSelector);
  if (refUrl === url) {
    return;
  }
  const { uri, position, schema, repoUri, file, revision } = parseLspUrl(url);
  if (uri && position) {
    yield put(
      findReferences({
        textDocument: {
          uri: toCanonicalUrl({ revision, schema, repoUri, file }),
        },
        position,
      })
    );
  }
}

function* handleFile(repoUri: string, file: string, revision: string) {
  const response: FetchFileResponse = yield select(fileSelector);
  const payload = response && response.payload;
  if (
    payload &&
    payload.path === file &&
    payload.revision === revision &&
    payload.uri === repoUri
  ) {
    return;
  }
  yield put(
    fetchFile({
      uri: repoUri,
      path: file,
      revision,
    })
  );
}

function fetchRepo(repoUri: string) {
  return kfetch({ pathname: `/api/code/repo/${repoUri}` });
}

function* loadRepoSaga(action: any) {
  try {
    const repo = yield call(fetchRepo, action.payload);
    yield put(loadRepoSuccess(repo));

    // turn on defaultRepoScope if there's no repo scope specified when enter a source view page
    const repoScope = yield select(repoScopeSelector);
    if (repoScope.length === 0) {
      yield put(turnOnDefaultRepoScope(repo));
    }
  } catch (e) {
    yield put(loadRepoFailed(e));
  }
}

export function* watchLoadRepo() {
  yield takeEvery(String(loadRepo), loadRepoSaga);
}

function* handleMainRouteChange(action: Action<Match>) {
  // in source view page, we need repos as default repo scope options when no query input
  yield put(fetchRepos());

  const { location } = action.payload!;
  const search = location.search.startsWith('?') ? location.search.substring(1) : location.search;
  const queryParams = queryString.parse(search);
  const { resource, org, repo, path: file, pathType, revision, goto } = action.payload!.params;
  const repoUri = `${resource}/${org}/${repo}`;
  let position;
  if (goto) {
    position = parseGoto(goto);
  }
  yield put(loadRepo(repoUri));
  yield put(fetchRepoBranches({ uri: repoUri }));
  if (file) {
    if ([PathTypes.blob, PathTypes.blame].includes(pathType as PathTypes)) {
      yield put(revealPosition(position));
      const { tab, refUrl } = queryParams;
      if (tab === 'references' && refUrl) {
        yield call(handleReference, decodeURIComponent(refUrl as string));
      } else {
        yield put(closeReferences(false));
      }
    }
    yield call(handleFile, repoUri, file, revision);
    const commits = yield select((state: RootState) => state.file.treeCommits[file]);
    if (commits === undefined) {
      yield put(fetchTreeCommits({ revision, uri: repoUri, path: file }));
    }
  }
  const lastRequestPath = yield select(lastRequestPathSelector);
  const currentTree: FileTree = yield select(getTree);
  // repo changed
  if (currentTree.repoUri !== repoUri) {
    yield put(resetRepoTree());
    yield put(fetchRepoCommits({ uri: repoUri, revision }));
    yield put(fetchRootRepoTree({ uri: repoUri, revision }));
  }
  const tree = yield select(getTree);
  const isDir = pathType === PathTypes.tree;
  const openPath = isDir
    ? file
    : (file || '')
        .split('/')
        .slice(0, -1)
        .join('/');
  yield put(openTreePath(openPath || ''));
  function isTreeLoaded(isDirectory: boolean, targetTree: FileTree | null) {
    if (!isDirectory) {
      return !!targetTree;
    } else if (!targetTree) {
      return false;
    } else {
      return targetTree.children && targetTree.children.length > 0;
    }
  }
  const targetTree: FileTree | null = yield select(createTreeSelector(file || ''));
  if (!isTreeLoaded(isDir, targetTree)) {
    yield put(
      fetchRepoTree({
        uri: repoUri,
        revision,
        path: file || '',
        parents: getPathOfTree(tree, (file || '').split('/')) === null,
        isDir,
      })
    );
  }
  const uri = toCanonicalUrl({
    repoUri,
    file,
    revision,
  });
  if (file && pathType === PathTypes.blob) {
    if (lastRequestPath !== uri) {
      yield put(loadStructure(uri!));
    }
  }
}

export function* watchMainRouteChange() {
  yield takeLatest(mainRoutePattern, handleMainRouteChange);
}
