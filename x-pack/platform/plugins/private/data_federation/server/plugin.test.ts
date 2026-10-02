/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { CoreSetup } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { registerUiSettings } from './ui_settings';
import { registerDataSetsRoutes } from './routes/register_routes';
import { DataFederationServerPlugin } from './plugin';
import type { DataFederationConfigType } from './config';

jest.mock('./ui_settings', () => ({
  registerUiSettings: jest.fn(),
}));

jest.mock('./routes/register_routes', () => ({
  registerDataSetsRoutes: jest.fn(),
}));

const baseConfig: DataFederationConfigType = {
  enabled: true,
  enableFederatedIdentityAuth: false,
  enableGoogleCloudStorageDataSourceType: false,
  enableAzureDataSourceType: false,
};

const setupPlugin = (config: DataFederationConfigType, { isServerless = false } = {}) => {
  const coreSetup = coreMock.createSetup();
  const features = featuresPluginMock.createSetup();

  const initializerContext = coreMock.createPluginInitializerContext(config);
  if (isServerless) {
    Object.defineProperty(initializerContext.env, 'packageInfo', {
      value: { ...initializerContext.env.packageInfo, buildFlavor: 'serverless' as const },
    });
  }

  new DataFederationServerPlugin(initializerContext).setup(coreSetup as unknown as CoreSetup, {
    features: features as unknown as FeaturesPluginSetup,
  });

  return { coreSetup, features };
};

describe('DataFederationServerPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the UI setting when the plugin is enabled', () => {
    const { coreSetup, features } = setupPlugin({ ...baseConfig, enabled: true });

    expect(registerUiSettings).toHaveBeenCalledWith({
      uiSettings: coreSetup.uiSettings,
      isServerless: false,
    });
    expect(features.registerElasticsearchFeature).toHaveBeenCalled();
    expect(registerDataSetsRoutes).toHaveBeenCalled();
  });

  it('registers the UI setting for serverless', () => {
    const { coreSetup } = setupPlugin(baseConfig, { isServerless: true });

    expect(registerUiSettings).toHaveBeenCalledWith({
      uiSettings: coreSetup.uiSettings,
      isServerless: true,
    });
  });

  it('does not register the UI setting when the plugin is disabled', () => {
    const { features } = setupPlugin({ ...baseConfig, enabled: false });

    expect(registerUiSettings).not.toHaveBeenCalled();
    expect(features.registerElasticsearchFeature).not.toHaveBeenCalled();
    expect(registerDataSetsRoutes).not.toHaveBeenCalled();
  });
});
