/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';

import { blame, BlameState } from './blame';
import { commit, CommitState } from './commit';
import { editor, EditorState } from './editor';
import { file, FileState } from './file';
import { languageServer, LanguageServerState } from './language_server';
import { repositoryManagement, RepositoryManagementState } from './repository_management';
import { route, RouteState } from './route';
import { search, SearchState } from './search';
import { setup, SetupState } from './setup';
import { shortcuts, ShortcutsState } from './shortcuts';
import { RepoState, RepoStatus, status, StatusState } from './status';
import { symbol, SymbolState } from './symbol';
import { RevisionState, revision } from './revision';
import { RepositoryState, repository } from './repository';
import { fileTree, FileTreeState } from './file_tree';

export { RepoState, RepoStatus };

export interface RootState {
  blame: BlameState;
  commit: CommitState;
  editor: EditorState;
  file: FileState;
  fileTree: FileTreeState;
  languageServer: LanguageServerState;
  repository: RepositoryState;
  repositoryManagement: RepositoryManagementState;
  revision: RevisionState;
  route: RouteState;
  search: SearchState;
  setup: SetupState;
  shortcuts: ShortcutsState;
  status: StatusState;
  symbol: SymbolState;
}

const reducers = {
  blame,
  commit,
  editor,
  file,
  fileTree,
  languageServer,
  repository,
  repositoryManagement,
  revision,
  route,
  search,
  setup,
  shortcuts,
  status,
  symbol,
};

// @ts-ignore
export const rootReducer = combineReducers<RootState>(reducers);
