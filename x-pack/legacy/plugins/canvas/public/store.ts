/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped local
import { createStore as createReduxStore } from './state/store';
// @ts-ignore Untyped local
import { getInitialState } from './state/initial_state';

import { FUNCTIONS_URL } from '../../../../../src/legacy/core_plugins/interpreter/public/canvas/consts';
import { CoreSetup } from '../../../../../src/core/public';

export async function createStore(core: CoreSetup) {
  const initialState = getInitialState();

  const basePath = core.http.basePath.get();
  const reportingBrowserType = core.injectedMetadata.getInjectedVar('reportingBrowserType');

  // Retrieve server functions
  const serverFunctionsResponse = await core.http.get(FUNCTIONS_URL);
  const serverFunctions = Object.values(serverFunctionsResponse);

  initialState.app = {
    basePath,
    reportingBrowserType,
    serverFunctions,
    ready: false,
  };

  return createReduxStore(initialState);
}
