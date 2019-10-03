/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { get, contains } from 'lodash';
import chrome from 'ui/chrome';

function isOnPage(hash) {
  return contains(window.location.hash, hash);
}

const angularState = {
  injector: null,
  scope: null,
};

const checkAngularState = () => {
  if (!angularState.injector || !angularState.scope) {
    throw 'Unable to interact with setup mode because the angular injector was not previously set.'
      + ' This needs to be set by calling `initSetupModeState`.';
  }
};

const setupModeState = {
  enabled: false,
  data: null,
  callbacks: []
};

export const getSetupModeState = () => setupModeState;

export const setNewlyDiscoveredClusterUuid = clusterUuid => {
  const globalState = angularState.injector.get('globalState');
  const executor = angularState.injector.get('$executor');
  angularState.scope.$apply(() => {
    globalState.cluster_uuid = clusterUuid;
    globalState.save();
  });
  executor.run();
};

export const fetchCollectionData = async (uuid, fetchWithoutClusterUuid = false) => {
  checkAngularState();

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;

  let url = '../api/monitoring/v1/setup/collection';
  if (uuid) {
    url += `/node/${uuid}`;
  }
  else if (!fetchWithoutClusterUuid && clusterUuid) {
    url += `/cluster/${clusterUuid}`;
  }
  else {
    url += '/cluster';
  }

  try {
    const response = await http.post(url, { ccs });
    return response.data;
  }
  catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

const notifySetupModeDataChange = (oldData) => {
  setupModeState.callbacks.forEach(cb => cb(oldData));
};

export const updateSetupModeData = async (uuid, fetchWithoutClusterUuid = false) => {
  const oldData = setupModeState.data;
  const data = await fetchCollectionData(uuid, fetchWithoutClusterUuid);
  setupModeState.data = data;
  if (get(data, '_meta.isOnCloud', false)) {
    return toggleSetupMode(false); // eslint-disable-line no-use-before-define
  }
  notifySetupModeDataChange(oldData);

  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  if (!clusterUuid) {
    const liveClusterUuid = get(data, '_meta.liveClusterUuid');
    const migratedEsNodes = Object.values(get(data, 'elasticsearch.byUuid', {}))
      .filter(node => node.isPartiallyMigrated || node.isFullyMigrated);
    if (liveClusterUuid && migratedEsNodes.length > 0) {
      setNewlyDiscoveredClusterUuid(liveClusterUuid);
    }
  }
};

export const disableElasticsearchInternalCollection = async () => {
  checkAngularState();

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const url = `../api/monitoring/v1/setup/collection/${clusterUuid}/disable_internal_collection`;
  try {
    const response = await http.post(url);
    return response.data;
  }
  catch (err) {
    const Private = angularState.injector.get('Private');
    const ajaxErrorHandlers = Private(ajaxErrorHandlersProvider);
    return ajaxErrorHandlers(err);
  }
};

export const toggleSetupMode = inSetupMode => {
  checkAngularState();

  const globalState = angularState.injector.get('globalState');
  setupModeState.enabled = inSetupMode;
  globalState.inSetupMode = inSetupMode;
  globalState.save();
  setSetupModeMenuItem(); // eslint-disable-line  no-use-before-define
  notifySetupModeDataChange();

  if (inSetupMode) {
    // Intentionally do not await this so we don't block UI operations
    updateSetupModeData();
  }
};

export const setSetupModeMenuItem = () => {
  checkAngularState();

  if (isOnPage('no-data')) {
    return;
  }

  const globalState = angularState.injector.get('globalState');
  const navItems = globalState.inSetupMode
    ? []
    : [{
      id: 'enter',
      label: 'Enter Setup Mode',
      description: 'Enter setup',
      run: () => toggleSetupMode(true),
      testId: 'enterSetupMode'
    }];

  angularState.scope.topNavMenu = [...navItems];
  // LOL angular
  if (!angularState.scope.$$phase) {
    angularState.scope.$apply();
  }
};

export const initSetupModeState = async ($scope, $injector, callback) => {
  angularState.scope = $scope;
  angularState.injector = $injector;
  callback && setupModeState.callbacks.push(callback);

  const globalState = $injector.get('globalState');
  if (globalState.inSetupMode) {
    await toggleSetupMode(true);
  }
};

export const isInSetupMode = async () => {
  if (setupModeState.enabled) {
    return true;
  }

  const $injector = angularState.injector || await chrome.dangerouslyGetActiveInjector();
  const globalState = $injector.get('globalState');
  return globalState.inSetupMode;
};
