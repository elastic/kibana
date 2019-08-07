/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { call, put, select, takeEvery } from 'redux-saga/effects';
import { SymbolInformation } from 'vscode-languageserver-types/lib/esm/main';
import { LspRestClient, TextDocumentMethods } from '../../common/lsp_client';
import {
  loadStructure,
  loadStructureFailed,
  loadStructureSuccess,
  StatusChanged,
} from '../actions';
import { SymbolWithMembers } from '../actions/structure';
import { matchContainerName } from '../utils/symbol_utils';
import { RepoFileStatus, StatusReport } from '../../common/repo_file_status';
import { RootState } from '../reducers';
import { toCanonicalUrl } from '../../common/uri_util';

type Container = SymbolWithMembers | undefined;

const SPECIAL_SYMBOL_NAME = '{...}';
const SPECIAL_CONTAINER_NAME = '';

const sortSymbol = (a: SymbolWithMembers, b: SymbolWithMembers) => {
  const lineDiff = a.location.range.start.line - b.location.range.start.line;
  if (lineDiff === 0) {
    return a.location.range.start.character - b.location.range.start.character;
  } else {
    return lineDiff;
  }
};

const generateStructureTree: (symbols: SymbolInformation[]) => SymbolWithMembers[] = symbols => {
  const structureTree: SymbolWithMembers[] = [];

  function findContainer(
    tree: SymbolWithMembers[],
    containerName?: string
  ): SymbolInformation | undefined {
    if (containerName === undefined) {
      return undefined;
    }
    const result = tree.find((s: SymbolInformation) => {
      return matchContainerName(containerName, s.name);
    });
    if (result) {
      return result;
    } else {
      // TODO: Use Array.flat once supported
      const subTree = tree.reduce(
        (s, t) => (t.members ? s.concat(t.members) : s),
        [] as SymbolWithMembers[]
      );
      if (subTree.length > 0) {
        return findContainer(subTree, containerName);
      } else {
        return undefined;
      }
    }
  }

  symbols
    .sort(sortSymbol)
    .forEach((s: SymbolInformation, index: number, arr: SymbolInformation[]) => {
      let container: Container;
      /**
       * For Enum class in Java, the container name and symbol name that LSP gives are special.
       * For more information, see https://github.com/elastic/codesearch/issues/580
       */
      if (s.containerName === SPECIAL_CONTAINER_NAME) {
        container = _.findLast(
          arr.slice(0, index),
          (sy: SymbolInformation) => sy.name === SPECIAL_SYMBOL_NAME
        );
      } else {
        container = findContainer(structureTree, s.containerName);
      }
      if (container) {
        if (!container.path) {
          container.path = container.name;
        }
        if (container.members) {
          container.members.push({ ...s, path: `${container.path}/${s.name}` });
        } else {
          container.members = [{ ...s, path: `${container.path}/${s.name}` }];
        }
      } else {
        structureTree.push({ ...s, path: s.name });
      }
    });

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
    const data = yield call(requestStructure, `git:/${action.payload}`);
    const structureTree = generateStructureTree(data);
    yield put(loadStructureSuccess({ path: action.payload!, data, structureTree }));
  } catch (e) {
    yield put(loadStructureFailed(e));
  }
}
