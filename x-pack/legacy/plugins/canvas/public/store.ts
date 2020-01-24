/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore Untyped local
import { createStore as createReduxStore } from './state/store';
// @ts-ignore Untyped local
import { getInitialState } from './state/initial_state';

import { CoreSetup } from '../../../../../src/core/public';
import { CanvasSetupDeps } from './plugin';

export async function createStore(core: CoreSetup, plugins: CanvasSetupDeps) {
  const initialState = getInitialState();

  const basePath = core.http.basePath.get();

  // Retrieve server functions
  const serverFunctionsResponse = await core.http.get(`/api/interpreter/fns`);
  const serverFunctions = Object.values(serverFunctionsResponse);

  initialState.app = {
    basePath,
    serverFunctions,
    ready: false,
  };

  return createReduxStore(initialState);
}
