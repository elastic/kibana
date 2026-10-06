/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { registerIntegrations } from './register_integrations';

describe('registerIntegrations', () => {
  const registerCustomIntegration = jest.fn();

  beforeEach(() => {
    registerCustomIntegration.mockClear();
    registerIntegrations(coreMock.createSetup(), {
      registerCustomIntegration,
    } as unknown as CustomIntegrationsPluginSetup);
  });

  const getRegistration = (id: string) =>
    registerCustomIntegration.mock.calls
      .map(([integration]) => integration)
      .find((i) => i.id === id);

  test.each(['ingest_geojson', 'ingest_shape'])('%s links to the maps file upload wizard', (id) => {
    expect(getRegistration(id)?.uiInternalPath).toBe(
      '/app/maps/map#?openLayerWizard=uploadGeoFile'
    );
  });
});
