/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
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

  const licenseOf = (type: 'basic' | 'platinum' | 'enterprise') =>
    licensingMock.createLicense({ license: { type, mode: type } });

  const startWith = (
    plugin: AiAnonymizationSettingsPlugin,
    advancedSettings?: { save?: boolean; show?: boolean },
    license$ = new BehaviorSubject(licenseOf('enterprise')),
    isSettingRegistered = true,
    actions: { show?: boolean; execute?: boolean } = { show: true, execute: true }
  ) => {
    const coreStart = coreMock.createStart();
    coreStart.application.capabilities = {
      ...coreStart.application.capabilities,
      advancedSettings: advancedSettings ?? {},
      // `show` stands for access to the Advanced Settings page, which the "Read" privilege grants
      // through the management capability and not through `advancedSettings.show`.
      management: { kibana: { settings: advancedSettings?.show === true } },
      actions,
    };
    coreStart.uiSettings.isDeclared.mockReturnValue(isSettingRegistered);
    plugin.start(coreStart, { licensing: { ...licensingMock.createStart(), license$ } });
    return license$;
  };

  it('registers the page disabled, so it does not add a Management entry before start() decides', () => {
    const { app } = setupPlugin();

    expect(app.disable).toHaveBeenCalledTimes(1);
    expect(app.enable).not.toHaveBeenCalled();
  });

  // GenAI Settings is visible with read access, and a user who can read the other AI settings must
  // be able to see what is masked; the page disables editing on its own for users who cannot save.
  it.each([
    ['can save advanced settings', { show: true, save: true }],
    ['has read-only access to advanced settings', { show: true, save: false }],
  ])('enables the page for a user who %s', (_, advancedSettings) => {
    const { plugin, app } = setupPlugin();

    startWith(plugin, advancedSettings);

    expect(app.enable).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['no advanced settings privilege', {}],
    ['advanced settings hidden', { show: false, save: false }],
  ])('keeps the page disabled for a user with %s', (_, advancedSettings) => {
    const { plugin, app } = setupPlugin();

    startWith(plugin, advancedSettings);

    expect(app.enable).not.toHaveBeenCalled();
  });

  // AI features, LLM connectors included, are Enterprise-only, so the page must not be offered below it.
  it.each(['basic', 'platinum'] as const)(
    'keeps the page disabled on a %s license even for users who can save advanced settings',
    (type) => {
      const { plugin, app } = setupPlugin();

      startWith(plugin, { show: true, save: true }, new BehaviorSubject(licenseOf(type)));

      expect(app.enable).not.toHaveBeenCalled();
    }
  );

  it('re-evaluates the entry on every license emission', () => {
    const { plugin, app } = setupPlugin();
    const license$ = startWith(plugin, { show: true, save: true });
    expect(app.enable).toHaveBeenCalledTimes(1);

    license$.next(licenseOf('basic'));
    expect(app.disable).toHaveBeenLastCalledWith();
    const disableCalls = app.disable.mock.calls.length;

    license$.next(licenseOf('enterprise'));
    expect(app.enable).toHaveBeenCalledTimes(2);
    expect(app.disable).toHaveBeenCalledTimes(disableCalls);
  });

  it('stops following the license once the plugin is stopped', () => {
    const { plugin, app } = setupPlugin();
    const license$ = startWith(plugin, { show: true, save: true });

    plugin.stop();
    license$.next(licenseOf('basic'));

    expect(app.disable).toHaveBeenCalledTimes(1); // only the initial registration
  });

  // The inference plugin registers `ai:anonymizationSettings`; without it the page cannot read its data.
  it('keeps the page disabled when the setting is not registered, as when inference is disabled', () => {
    const { plugin, app } = setupPlugin();

    startWith(
      plugin,
      { show: true, save: true },
      new BehaviorSubject(licenseOf('enterprise')),
      false
    );

    expect(app.enable).not.toHaveBeenCalled();
  });

  // Some serverless tiers (for example observability essentials) have no connectors, so no AI features
  // to configure; GenAI Settings is hidden there by the same capability check.
  it.each([
    ['no connectors capability', {}],
    ['connectors that can be listed but not run', { show: true, execute: false }],
  ])('keeps the page disabled for a user with %s', (_, actions) => {
    const { plugin, app } = setupPlugin();

    startWith(
      plugin,
      { show: true, save: true },
      new BehaviorSubject(licenseOf('enterprise')),
      true,
      actions
    );

    expect(app.enable).not.toHaveBeenCalled();
  });
});
