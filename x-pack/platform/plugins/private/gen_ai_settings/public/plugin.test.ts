/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { GenAiSettingsPlugin } from './plugin';

describe('GenAI Settings Plugin', () => {
  describe('Licensing', () => {
    const createManagementMock = () => {
      const registerApp = jest.fn();
      return {
        sections: {
          section: {
            ai: {
              registerApp,
            },
          },
        },
      } as unknown as ManagementSetup & {
        sections: { section: { ai: { registerApp: jest.Mock } } };
      };
    };

    const createCoreSetupMock = (
      coreStart: Partial<CoreStart>,
      licensing: any
    ): CoreSetup<any, any> =>
      ({
        getStartServices: jest.fn().mockResolvedValue([coreStart, { licensing } as any, {} as any]),
      } as any);

    const createPlugin = () =>
      new GenAiSettingsPlugin({
        config: { get: jest.fn(() => ({})) },
        env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
      } as unknown as PluginInitializerContext);

    it('does not register the app when license is not enterprise', async () => {
      const plugin = createPlugin();
      const management = createManagementMock();

      const license$ = new BehaviorSubject<any>({ hasAtLeast: () => false });
      const coreStart: Partial<CoreStart> = {
        application: {
          capabilities: {
            actions: { show: true, execute: true },
          },
        },
      } as any;
      const coreSetup = createCoreSetupMock(coreStart, { license$ });

      await plugin.setup(coreSetup, { management });

      expect(management.sections.section.ai.registerApp).not.toHaveBeenCalled();
    });

    it('registers the app only when license is enterprise and capabilities allow it', async () => {
      const plugin = createPlugin();
      const management = createManagementMock();

      const license$ = new BehaviorSubject<any>({
        hasAtLeast: (level: string) => level === 'enterprise',
      });
      const coreStart: Partial<CoreStart> = {
        application: {
          capabilities: {
            actions: { show: true, execute: true },
          },
        },
      } as any;
      const coreSetup = createCoreSetupMock(coreStart, { license$ });

      await plugin.setup(coreSetup, { management });

      expect(management.sections.section.ai.registerApp).toHaveBeenCalledTimes(1);
    });
  });
});
