/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from './ajax_error_handler';
import { get } from 'lodash';

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
  return new Promise(async (resolve, reject) => {
    try {
      checkAngularState();
    } catch (err) {
      return reject(err);
    }

    const globalState = angularState.injector.get('globalState');
    setupModeState.enabled = inSetupMode;
    globalState.inSetupMode = inSetupMode;
    globalState.save();
    setSetupModeMenuItem(); // eslint-disable-line  no-use-before-define
    notifySetupModeDataChange();

    if (inSetupMode) {
      await updateSetupModeData();
    }

    resolve();
  });
};

const setSetupModeMenuItem = () => {
  // Disabling this for this initial release. This will be added back in
  // in a subsequent PR
  // checkAngularState();

  // const globalState = angularState.injector.get('globalState');
  // const navItems = globalState.inSetupMode
  //   ? [
  //     {
  //       key: 'exit',
  //       label: 'Exit Setup Mode',
  //       description: 'Exit setup mode',
  //       run: () => toggleSetupMode(false),
  //       testId: 'exitSetupMode'
  //     },
  //     {
  //       key: 'refresh',
  //       label: 'Refresh Setup Data',
  //       description: 'Refresh data used for setup mode',
  //       run: () => updateSetupModeData(),
  //       testId: 'refreshSetupModeData'
  //     }
  //   ]
  //   : [{
  //     key: 'enter',
  //     label: 'Enter Setup Mode',
  //     description: 'Enter setup mode',
  //     run: () => toggleSetupMode(true),
  //     testId: 'enterSetupMode'
  //   }];

  // angularState.scope.topNavMenu = [...navItems];
};

export const initSetupModeState = ($scope, $injector, callback) => {
  angularState.scope = $scope;
  angularState.injector = $injector;
  setSetupModeMenuItem();
  callback && setupModeState.callbacks.push(callback);

  const globalState = angularState.injector.get('globalState');
  if (globalState.inSetupMode) {
    toggleSetupMode(true);
  }
};
