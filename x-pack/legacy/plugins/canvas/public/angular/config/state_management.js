/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function initStateManagement(coreStart, plugins) {
  // disable the kibana state management
  const app = plugins.__LEGACY.uiModules.get('apps/canvas');
  app.config(stateManagementConfigProvider => {
    stateManagementConfigProvider.disable();
  });
}
