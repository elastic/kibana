/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fork } from 'redux-saga/effects';

import { watchBlame, watchLoadBlame } from './blame';
import { watchLoadCommit } from './commit';
import {
  watchCloseReference,
  watchLoadRepo,
  watchLspMethods,
  watchMainRouteChange,
} from './editor';
import {
  watchFetchBranchesAndCommits,
  watchFetchRepoTree,
  watchRepoRouteChange,
  watchFetchRootRepoTree,
} from './file';
import { watchInstallLanguageServer, watchLoadLanguageServers } from './language_server';
import {
  watchLoadRepoListStatus,
  watchLoadRepoStatus,
  watchPollingRepoStatus,
  watchRepoCloneStatusPolling,
  watchRepoDeleteStatusPolling,
  watchRepoIndexStatusPolling,
  watchResetPollingStatus,
} from './project_status';
import {
  watchAdminRouteChange,
  watchDeleteRepo,
  watchFetchRepoConfigs,
  watchFetchRepos,
  watchGotoRepo,
  watchImportRepo,
  watchIndexRepo,
  watchInitRepoCmd,
} from './repository';
import {
  watchDocumentSearch,
  watchRepoScopeSearch,
  watchRepositorySearch,
  watchSearchRouteChange,
} from './search';
import { watchRootRoute } from './setup';
import { watchRepoCloneSuccess, watchRepoDeleteFinished } from './status';
import { watchLoadStructure } from './structure';

export function* rootSaga() {
  yield fork(watchRootRoute);
  yield fork(watchLoadCommit);
  yield fork(watchFetchRepos);
  yield fork(watchDeleteRepo);
  yield fork(watchIndexRepo);
  yield fork(watchImportRepo);
  yield fork(watchFetchRepoTree);
  yield fork(watchFetchRootRepoTree);
  yield fork(watchFetchBranchesAndCommits);
  yield fork(watchDocumentSearch);
  yield fork(watchRepositorySearch);
  yield fork(watchLoadStructure);
  yield fork(watchLspMethods);
  yield fork(watchCloseReference);
  yield fork(watchFetchRepoConfigs);
  yield fork(watchInitRepoCmd);
  yield fork(watchGotoRepo);
  yield fork(watchLoadRepo);
  yield fork(watchSearchRouteChange);
  yield fork(watchAdminRouteChange);
  yield fork(watchMainRouteChange);
  yield fork(watchLoadRepo);
  yield fork(watchRepoRouteChange);
  yield fork(watchLoadBlame);
  yield fork(watchBlame);
  yield fork(watchRepoCloneSuccess);
  yield fork(watchRepoDeleteFinished);
  yield fork(watchLoadLanguageServers);
  yield fork(watchInstallLanguageServer);
  yield fork(watchLoadRepoListStatus);
  yield fork(watchLoadRepoStatus);

  // Repository status polling sagas begin
  yield fork(watchPollingRepoStatus);
  yield fork(watchResetPollingStatus);
  yield fork(watchRepoDeleteStatusPolling);
  yield fork(watchRepoIndexStatusPolling);
  yield fork(watchRepoCloneStatusPolling);
  // Repository status polling sagas end

  yield fork(watchRepoScopeSearch);
}
