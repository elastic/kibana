/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import { AiAnonymizationSettingsPlugin } from './plugin';

describe('AiAnonymizationSettingsPlugin', () => {
  const setupPlugin = () => {
    const app = { enable: jest.fn(), disable: jest.fn() };
    const management = {
      sections: { section: { ai: { registerApp: jest.fn().mockReturnValue(app) } } },
    } as unknown as ManagementSetup;

    const plugin = new AiAnonymizationSettingsPlugin(
      coreMock.createPluginInitializerContext({ patternTester: { enabled: true } })
    );
    plugin.setup(coreMock.createSetup(), { management });

    return { plugin, app };
  };

  const startWith = (
    plugin: AiAnonymizationSettingsPlugin,
    advancedSettings?: { save?: boolean; show?: boolean }
  ) => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      advancedSettings: advancedSettings ?? {},
    };
    plugin.start(coreStart);
  };

  it('registers the page disabled, so it does not add a Management entry before start() decides', () => {
    const { app } = setupPlugin();

    expect(app.disable).toHaveBeenCalledTimes(1);
    expect(app.enable).not.toHaveBeenCalled();
  });

  it('enables the page for users who can save advanced settings, which the tester and saves need', () => {
    const { plugin, app } = setupPlugin();

    startWith(plugin, { show: true, save: true });

    expect(app.enable).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['read-only access to advanced settings', { show: true, save: false }],
    ['no advanced settings privilege', {}],
  ])('keeps the page disabled for a user with %s', (_, advancedSettings) => {
    const { plugin, app } = setupPlugin();

    startWith(plugin, advancedSettings);

    expect(app.enable).not.toHaveBeenCalled();
  });
});
