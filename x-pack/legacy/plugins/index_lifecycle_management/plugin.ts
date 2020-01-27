/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from './shim';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { registerIndexRoutes } from './server/routes/api/index';
import { registerNodesRoutes } from './server/routes/api/nodes';
import { registerPoliciesRoutes } from './server/routes/api/policies';
import { registerTemplatesRoutes } from './server/routes/api/templates';

const indexLifecycleDataEnricher = async (indicesList, callWithRequest) => {
  if (!indicesList || !indicesList.length) {
    return;
  }
  const params = {
    path: '/*/_ilm/explain',
    method: 'GET',
  };
  const { indices: ilmIndicesData } = await callWithRequest('transport.request', params);
  return indicesList.map(index => {
    return {
      ...index,
      ilm: { ...(ilmIndicesData[index.name] || {}) },
    };
  });
};

export class Plugin {
  public setup(core: CoreSetup): void {
    const { server } = core;

    registerLicenseChecker(server);

    // Register routes.
    registerIndexRoutes(server);
    registerNodesRoutes(server);
    registerPoliciesRoutes(server);
    registerTemplatesRoutes(server);

    if (
      server.config().get('xpack.ilm.ui.enabled') &&
      server.plugins.index_management &&
      server.plugins.index_management.addIndexManagementDataEnricher
    ) {
      server.plugins.index_management.addIndexManagementDataEnricher(indexLifecycleDataEnricher);
    }
  }
}
