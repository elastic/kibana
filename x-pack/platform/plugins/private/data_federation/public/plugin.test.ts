/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';
import { DATA_FEDERATION_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { DataFederationPlugin } from './plugin';
import { PLUGIN_ID } from '../common';
import type { StartDependencies } from './types';

const createInitializerContext = () =>
  ({
    config: {
      get: () => ({
        enabled: true,
        enableFederatedIdentityAuth: false,
        enableGoogleCloudStorageDataSourceType: false,
        enableAzureDataSourceType: false,
      }),
    },
  } as unknown as PluginInitializerContext);

const setupPlugin = async ({ isUiSettingEnabled }: { isUiSettingEnabled: boolean }) => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  const capabilities = coreStart.application.capabilities as unknown as Record<string, unknown>;
  capabilities[PLUGIN_ID] = { manageFederatedData: true };

  (coreStart.uiSettings.get as jest.Mock).mockImplementation((key: string) =>
    key === DATA_FEDERATION_ENABLED_SETTING_ID ? isUiSettingEnabled : undefined
  );

  coreSetup.getStartServices.mockResolvedValue([coreStart, {} as StartDependencies, {}]);

  const management = managementPluginMock.createSetupContract();

  new DataFederationPlugin(createInitializerContext()).setup(
    coreSetup as unknown as CoreSetup<StartDependencies>,
    { management }
  );

  await new Promise(process.nextTick);

  return management.sections.section.data.registerApp as jest.Mock;
};

describe('DataFederationPlugin', () => {
  it('registers the management app when the advanced setting is enabled', async () => {
    const registerApp = await setupPlugin({ isUiSettingEnabled: true });

    expect(registerApp).toHaveBeenCalledWith(expect.objectContaining({ id: PLUGIN_ID }));
  });

  it('does not register the management app when the advanced setting is disabled', async () => {
    const registerApp = await setupPlugin({ isUiSettingEnabled: false });

    expect(registerApp).not.toHaveBeenCalled();
  });
});
