/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { createStore } from '../../state/store';
import { getInitialState } from '../../state/initial_state';

const app = uiModules.get('apps/canvas');
app.service('canvasStore', (kbnVersion, basePath, reportingBrowserType, serverFunctions) => {
  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    basePath,
    reportingBrowserType,
    serverFunctions,
    ready: false,
  };

  const store = createStore(initialState);

  // TODO: debugging, remove this
  window.canvasStore = store;

  return store;
});
