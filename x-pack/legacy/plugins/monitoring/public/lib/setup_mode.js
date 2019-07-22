/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ajaxErrorHandlersProvider } from './ajax_error_handler';

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

export const fetchCollectionData = async () => {
  checkAngularState();

  const http = angularState.injector.get('$http');
  const globalState = angularState.injector.get('globalState');
  const clusterUuid = globalState.cluster_uuid;
  const ccs = globalState.ccs;

  let url = '../api/monitoring/v1/setup/collection';
  if (clusterUuid) {
    url += `/${clusterUuid}`;
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

const notifySetupModeDataChange = () => {
  setupModeState.callbacks.forEach(cb => cb());
};

export const updateSetupModeData = async () => {
  setupModeState.data = await fetchCollectionData();
  notifySetupModeDataChange();
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
