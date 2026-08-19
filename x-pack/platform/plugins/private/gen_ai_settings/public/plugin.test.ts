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
  const createAppMock = () => ({
    enable: jest.fn(),
    disable: jest.fn(),
  });

  const createManagementMock = (app = createAppMock()) => {
    const registerApp = jest.fn().mockReturnValue(app);
    return {
      app,
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
    };
  };

  const createCoreSetupMock = (): CoreSetup<any, any> =>
    ({
      getStartServices: jest.fn(),
    } as any);

  const createCoreStartMock = (
    capabilities: Partial<CoreStart['application']['capabilities']>
  ): CoreStart =>
    ({
      application: { capabilities },
    } as any);

  const createPlugin = () =>
    new GenAiSettingsPlugin({
      config: { get: jest.fn(() => ({})) },
      env: { packageInfo: { buildFlavor: 'traditional', branch: 'main' } },
    } as unknown as PluginInitializerContext);

  describe('setup()', () => {
    it('always registers the app synchronously', () => {
      const plugin = createPlugin();
      const { management } = createManagementMock();

      plugin.setup(createCoreSetupMock(), { management });

      expect(management.sections.section.ai.registerApp).toHaveBeenCalledTimes(1);
    });

    it('disables the app immediately after registration', () => {
      const app = createAppMock();
      const { management } = createManagementMock(app);

      const plugin = createPlugin();
      plugin.setup(createCoreSetupMock(), { management });

      expect(app.disable).toHaveBeenCalledTimes(1);
      expect(app.enable).not.toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    describe('Licensing', () => {
      it('enables the app when license is enterprise and connectors capabilities allow it', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({
          hasAtLeast: (level: string) => level === 'enterprise',
        });
        const coreStart = createCoreStartMock({
          actions: { show: true, execute: true },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);

        expect(app.enable).toHaveBeenCalledTimes(1);
      });

      it('enables the app when license is enterprise and anonymization capabilities allow it', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({
          hasAtLeast: (level: string) => level === 'enterprise',
        });
        const coreStart = createCoreStartMock({
          anonymization: { show: true, manage: false },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);

        expect(app.enable).toHaveBeenCalledTimes(1);
      });

      it('keeps the app disabled when license is not enterprise', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({ hasAtLeast: () => false });
        const coreStart = createCoreStartMock({
          actions: { show: true, execute: true },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);

        expect(app.enable).not.toHaveBeenCalled();
        // disable() called once from setup() and once from start() subscription
        expect(app.disable).toHaveBeenCalledTimes(2);
      });

      it('keeps the app disabled when enterprise license exists but no capabilities match', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({
          hasAtLeast: (level: string) => level === 'enterprise',
        });
        const coreStart = createCoreStartMock({
          actions: { show: false, execute: false },
          anonymization: { show: false, manage: false },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);

        expect(app.enable).not.toHaveBeenCalled();
        expect(app.disable).toHaveBeenCalledTimes(2);
      });

      it('keeps the app disabled when anonymization capabilities exist but license is not enterprise', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({ hasAtLeast: () => false });
        const coreStart = createCoreStartMock({
          anonymization: { show: true, manage: true },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);

        expect(app.enable).not.toHaveBeenCalled();
        expect(app.disable).toHaveBeenCalledTimes(2);
      });

      it('reacts to license changes — disables then re-enables when license upgrades', () => {
        const app = createAppMock();
        const { management } = createManagementMock(app);
        const plugin = createPlugin();
        plugin.setup(createCoreSetupMock(), { management });

        const license$ = new BehaviorSubject<any>({ hasAtLeast: () => false });
        const coreStart = createCoreStartMock({
          actions: { show: true, execute: true },
        });

        plugin.start(coreStart, { licensing: { license$ } } as any);
        expect(app.enable).not.toHaveBeenCalled();

        // License upgrades to enterprise
        license$.next({ hasAtLeast: (level: string) => level === 'enterprise' });
        expect(app.enable).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('stop()', () => {
    it('unsubscribes from the license observable', () => {
      const app = createAppMock();
      const { management } = createManagementMock(app);
      const plugin = createPlugin();
      plugin.setup(createCoreSetupMock(), { management });

      const license$ = new BehaviorSubject<any>({ hasAtLeast: () => false });
      const coreStart = createCoreStartMock({
        actions: { show: true, execute: true },
      });

      plugin.start(coreStart, { licensing: { license$ } } as any);
      expect(license$.observed).toBe(true);

      plugin.stop();
      expect(license$.observed).toBe(false);
    });
  });
});
