/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ConnectorCatalogEprConfig } from './config';
import { ConnectorCatalogEprPlugin } from './plugin';

const createPlugin = () => {
  const context = coreMock.createPluginInitializerContext<ConnectorCatalogEprConfig>({
    enabled: true,
    registryUrl: 'http://epr.test',
    packageName: 'kibana_connector_specs',
    publicKeyPath: '/keys/public.asc',
  });
  return new ConnectorCatalogEprPlugin(context);
};

describe('ConnectorCatalogEprPlugin', () => {
  it('registers one catalog source with the actions plugin', () => {
    const actions = actionsMock.createSetup();

    createPlugin().setup(coreMock.createSetup(), { actions });

    expect(actions.registerConnectorCatalogSource).toHaveBeenCalledTimes(1);
    expect(actions.registerConnectorCatalogSource).toHaveBeenCalledWith(
      expect.objectContaining({
        getManifest: expect.any(Function),
        getDefinitions: expect.any(Function),
      })
    );
  });

  it('registers the fetch route', () => {
    const coreSetup = coreMock.createSetup();
    const router = coreSetup.http.createRouter();
    coreSetup.http.createRouter.mockReturnValue(router);

    createPlugin().setup(coreSetup, { actions: actionsMock.createSetup() });

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/internal/connector_catalog_epr/fetch' }),
      expect.any(Function)
    );
  });
});
