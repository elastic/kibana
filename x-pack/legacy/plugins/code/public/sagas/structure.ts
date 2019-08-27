/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import { DocumentSymbol } from 'vscode-languageserver-types';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import {
  loadStructure,
  loadStructureFailed,
  loadStructureSuccess,
  StatusChanged,
} from '../actions';
import { SymbolWithMembers } from '../actions/structure';
import { RepoFileStatus, StatusReport } from '../../common/repo_file_status';
import { RootState } from '../reducers';
import { toCanonicalUrl } from '../../common/uri_util';

const sortSymbol = (a: SymbolWithMembers, b: SymbolWithMembers) => {
  const lineDiff = a.range.start.line - b.range.start.line;
  if (lineDiff === 0) {
    return a.range.start.character - b.range.start.character;
  } else {
    return lineDiff;
  }
};

const generateStructureTree: (documentSymbol: DocumentSymbol, path: string) => SymbolWithMembers = (
  documentSymbol,
  path
) => {
  const currentPath = path ? `${path}/${documentSymbol.name}` : documentSymbol.name;
  const structureTree: SymbolWithMembers = {
    name: documentSymbol.name,
    kind: documentSymbol.kind,
    path: currentPath,
    range: documentSymbol.range,
    selectionRange: documentSymbol.selectionRange,
  };
  if (documentSymbol.children) {
    structureTree.members = documentSymbol.children
      .sort(sortSymbol)
      .map(ds => generateStructureTree(ds, currentPath));
  }
  return structureTree;
};

function requestStructure(uri?: string) {
  const lspClient = new LspRestClient('/api/code/lsp');
  const lspMethods = new TextDocumentMethods(lspClient);
  return lspMethods.documentSymbol.send({
    textDocument: {
      uri: uri || '',
    },
  });
}

function* statusChanged(action: Action<any>) {
  const {
    prevStatus,
    currentStatus,
  }: { prevStatus: StatusReport; currentStatus: StatusReport } = action.payload;
  if (
    prevStatus &&
    prevStatus.langServerStatus === RepoFileStatus.LANG_SERVER_IS_INITIALIZING &&
    currentStatus.langServerStatus !== RepoFileStatus.LANG_SERVER_IS_INITIALIZING
  ) {
    const { revision, uri, path } = yield select(
      (state: RootState) => state.status.currentStatusPath
    );
    const u = toCanonicalUrl({
      repoUri: uri,
      file: path,
      revision,
    });
    yield call(fetchSymbols, loadStructure(u));
  }
}

export function* watchLoadStructure() {
  yield takeEvery(String(loadStructure), fetchSymbols);
  yield takeEvery(String(StatusChanged), statusChanged);
}

function* fetchSymbols(action: Action<string>) {
  try {
    const data: DocumentSymbol[] = yield call(requestStructure, `git:/${action.payload}`);
    const structureTree = data.sort(sortSymbol).map(ds => generateStructureTree(ds, ''));
    yield put(loadStructureSuccess({ path: action.payload!, data, structureTree }));
  } catch (e) {
    yield put(loadStructureFailed(e));
  }
}
