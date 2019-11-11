/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export interface ServerFacade {
  config: Legacy.Server['config'];
  getInjectedUiAppVars: Legacy.Server['getInjectedUiAppVars'];
  indexPatternsServiceFactory: Legacy.Server['indexPatternsServiceFactory'];
  injectUiAppVars: Legacy.Server['injectUiAppVars'];
  log: Legacy.Server['log'];
  newPlatform: {
    coreContext: {
      logger: Legacy.Server['newPlatform']['coreContext']['logger'];
    };
    env: Legacy.Server['newPlatform']['env'];
  };
  plugins: {
    alerting?: Legacy.Server['plugins']['alerting'];
    xpack_main: Legacy.Server['plugins']['xpack_main'];
  };
  register: Legacy.Server['register'];
  route: Legacy.Server['route'];
  savedObjects: Legacy.Server['savedObjects'];
}
