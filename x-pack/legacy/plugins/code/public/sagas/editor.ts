/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import queryString from 'querystring';
import { Action } from 'redux-actions';
import { npStart } from 'ui/new_platform';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import Url from 'url';
import { call, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { parseGoto, parseLspUrl, toCanonicalUrl } from '../../common/uri_util';
import { FileTree } from '../../model';
import {
  fetchFile,
  FetchFileResponse,
  fetchRepoTree,
  fetchTreeCommits,
  findReferences,
  findReferencesFailed,
  findReferencesSuccess,
  loadStructure,
  Match,
  revealPosition,
  fetchRepos,
  turnOnDefaultRepoScope,
  findDefinitions,
  findDefinitionsSuccess,
  findDefinitionsFailed,
  closePanel,
} from '../actions';
import { loadRepo, loadRepoFailed, loadRepoSuccess } from '../actions/status';
import { PathTypes } from '../common/types';
import { RootState } from '../reducers';
import { getPathOfTree } from '../reducers/file_tree';
import {
  fileSelector,
  getTree,
  lastRequestPathSelector,
  refUrlSelector,
  repoScopeSelector,
  urlQueryStringSelector,
  createTreeSelector,
  reposSelector,
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

function* handleDefinitions(action: Action<TextDocumentPositionParams>) {
  try {
    const params: TextDocumentPositionParams = action.payload!;
    const { title, files } = yield call(requestFindDefinitions, params);
    const repos = Object.keys(files).map((repo: string) => ({ repo, files: files[repo] }));
    yield put(findDefinitionsSuccess({ title, repos }));
  } catch (error) {
    yield put(findDefinitionsFailed(error));
  }
}

function requestFindReferences(params: TextDocumentPositionParams) {
  return npStart.core.http.post(`/api/code/lsp/findReferences`, {
    body: JSON.stringify(params),
  });
}

function requestFindDefinitions(params: TextDocumentPositionParams) {
  return npStart.core.http.post(`/api/code/lsp/findDefinitions`, {
    body: JSON.stringify(params),
  });
}

export function* watchLspMethods() {
  yield takeLatest(String(findReferences), handleReferences);
  yield takeLatest(String(findDefinitions), handleDefinitions);
}

function* handleClosePanel(action: Action<boolean>) {
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
  yield takeLatest(String(closePanel), handleClosePanel);
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

function* openDefinitions(url: string) {
  const refUrl = yield select(refUrlSelector);
  if (refUrl === url) {
    return;
  }
  const { uri, position, schema, repoUri, file, revision } = parseLspUrl(url);
  if (uri && position) {
    yield put(
      findDefinitions({
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
  return npStart.core.http.get(`/api/code/repo/${repoUri}`);
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
  const repos = yield select(reposSelector);
  if (repos.length === 0) {
    // in source view page, we need repos as default repo scope options when no query input
    yield put(fetchRepos());
  }
  const { location } = action.payload!;
  const search = location.search.startsWith('?') ? location.search.substring(1) : location.search;
  const queryParams = queryString.parse(search);
  const { resource, org, repo, path: file, pathType, revision, goto } = action.payload!.params;
  const repoUri = `${resource}/${org}/${repo}`;
  let position;
  if (goto) {
    position = parseGoto(goto);
  }
  if (file) {
    if ([PathTypes.blob, PathTypes.blame].includes(pathType as PathTypes)) {
      yield put(revealPosition(position));
      const { tab, refUrl } = queryParams;
      if (tab === 'references' && refUrl) {
        yield call(handleReference, decodeURIComponent(refUrl as string));
      } else if (tab === 'definitions' && refUrl) {
        yield call(openDefinitions, decodeURIComponent(refUrl as string));
      } else {
        yield put(closePanel(false));
      }
      yield call(handleFile, repoUri, file, revision);
    } else {
      const commits = yield select((state: RootState) => state.revision.treeCommits[file]);
      if (commits === undefined) {
        yield put(fetchTreeCommits({ revision, uri: repoUri, path: file }));
      }
    }
  }
  const lastRequestPath = yield select(lastRequestPathSelector);
  const tree = yield select(getTree);
  const isDir = pathType === PathTypes.tree;
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
