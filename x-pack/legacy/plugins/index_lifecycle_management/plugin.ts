/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { LegacySetup } from './shim';
import { registerLicenseChecker } from './server/lib/register_license_checker';
import { registerIndexRoutes } from './server/routes/api/index';
import { registerNodesRoutes } from './server/routes/api/nodes';
import { registerPoliciesRoutes } from './server/routes/api/policies';
import { registerTemplatesRoutes } from './server/routes/api/templates';

const indexLifecycleDataEnricher = async (indicesList: any, callWithRequest: any) => {
  if (!indicesList || !indicesList.length) {
    return;
  }
  const params = {
    path: '/*/_ilm/explain',
    method: 'GET',
  };
  const { indices: ilmIndicesData } = await callWithRequest('transport.request', params);
  return indicesList.map((index: any): any => {
    return {
      ...index,
      ilm: { ...(ilmIndicesData[index.name] || {}) },
    };
  });
};

export class Plugin {
  public setup(core: CoreSetup, plugins: any, __LEGACY: LegacySetup): void {
    const { server } = __LEGACY;

    registerLicenseChecker(server);

    // Register routes.
    registerIndexRoutes(server);
    registerNodesRoutes(server);
    registerPoliciesRoutes(server);
    registerTemplatesRoutes(server);

    const serverPlugins = server.plugins as any;

    if (
      server.config().get('xpack.ilm.ui.enabled') &&
      serverPlugins.index_management &&
      serverPlugins.index_management.addIndexManagementDataEnricher
    ) {
      serverPlugins.index_management.addIndexManagementDataEnricher(indexLifecycleDataEnricher);
    }
  }
}
