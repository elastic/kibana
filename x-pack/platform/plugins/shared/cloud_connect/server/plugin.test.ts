/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { CloudConnectedPlugin } from './plugin';
import {
  CloudConnectApiKeyType,
  CloudConnectApiKeyEncryptionParams,
} from './saved_objects/cloud_connect_api_key';

function createPlugin() {
  const context = coreMock.createPluginInitializerContext({
    cloudUrl: 'https://cloud.test',
  });
  return new CloudConnectedPlugin(context);
}

function buildSetupDeps(cloudOverrides?: Record<string, unknown>) {
  return {
    features: featuresPluginMock.createSetup(),
    encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
    cloud: cloudOverrides
      ? ({ isCloudEnabled: false, isEce: false, ...cloudOverrides } as any)
      : undefined,
  };
}

describe('CloudConnectedPlugin.setup()', () => {
  describe('saved object type registration', () => {
    it('registers the SO type on ESS (isCloudEnabled=true, isEce=false)', () => {
      const plugin = createPlugin();
      const core = coreMock.createSetup();
      const plugins = buildSetupDeps({ isCloudEnabled: true, isEce: false });

      plugin.setup(core, plugins);

      expect(core.savedObjects.registerType).toHaveBeenCalledWith(CloudConnectApiKeyType);
      expect(plugins.encryptedSavedObjects.registerType).toHaveBeenCalledWith(
        CloudConnectApiKeyEncryptionParams
      );
    });

    it('registers the SO type on ECE (isCloudEnabled=true, isEce=true)', () => {
      const plugin = createPlugin();
      const core = coreMock.createSetup();
      const plugins = buildSetupDeps({ isCloudEnabled: true, isEce: true });

      plugin.setup(core, plugins);

      expect(core.savedObjects.registerType).toHaveBeenCalledWith(CloudConnectApiKeyType);
      expect(plugins.encryptedSavedObjects.registerType).toHaveBeenCalledWith(
        CloudConnectApiKeyEncryptionParams
      );
    });

    it('registers the SO type when cloud plugin is absent (self-managed)', () => {
      const plugin = createPlugin();
      const core = coreMock.createSetup();
      const plugins = buildSetupDeps();

      plugin.setup(core, plugins);

      expect(core.savedObjects.registerType).toHaveBeenCalledWith(CloudConnectApiKeyType);
      expect(plugins.encryptedSavedObjects.registerType).toHaveBeenCalledWith(
        CloudConnectApiKeyEncryptionParams
      );
    });
  });

  describe('ESS gate', () => {
    it('does NOT register features or routes on ESS', () => {
      const plugin = createPlugin();
      const core = coreMock.createSetup();
      const plugins = buildSetupDeps({ isCloudEnabled: true, isEce: false });

      plugin.setup(core, plugins);

      expect(plugins.features.registerKibanaFeature).not.toHaveBeenCalled();
      expect(core.http.createRouter).not.toHaveBeenCalled();
    });

    it('DOES register features and routes on ECE', () => {
      const plugin = createPlugin();
      const core = coreMock.createSetup();
      const plugins = buildSetupDeps({ isCloudEnabled: true, isEce: true });

      plugin.setup(core, plugins);

      expect(plugins.features.registerKibanaFeature).toHaveBeenCalled();
    });
  });
});
