/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { GenAiSettingsPlugin } from './plugin';

describe('GenAI Settings Plugin', () => {
  const createManagementMock = () => {
    const registerApp = jest.fn().mockReturnValue({});
    return {
      management: {
        sections: {
          section: {
            ai: {
              registerApp,
            },
          },
        },
      } as unknown as ManagementSetup & {
        sections: { section: { ai: { registerApp: jest.Mock } } };
      },
      registerApp,
    };
  };

  const createCoreSetupMock = (): CoreSetup<any, any> =>
    ({
      getStartServices: jest.fn(),
    } as any);

  const createPlugin = () =>
    new GenAiSettingsPlugin({
      config: { get: jest.fn(() => ({})) },
      env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
    } as unknown as PluginInitializerContext);

  describe('setup()', () => {
    it('registers the management app synchronously and leaves it enabled by default', () => {
      const plugin = createPlugin();
      const { management, registerApp } = createManagementMock();

      const registeredApp = { enable: jest.fn(), disable: jest.fn() };
      registerApp.mockReturnValue(registeredApp);

      plugin.setup(createCoreSetupMock(), { management });

      expect(registerApp).toHaveBeenCalledTimes(1);
      expect(registeredApp.disable).not.toHaveBeenCalled();
      expect(registeredApp.enable).not.toHaveBeenCalled();
    });
  });
});
