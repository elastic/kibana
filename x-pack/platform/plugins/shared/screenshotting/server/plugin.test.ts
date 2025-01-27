/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./browsers/install');

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import { install } from './browsers/install';
import { ScreenshottingPlugin } from './plugin';

describe('ScreenshottingPlugin', () => {
  let initContext: PluginInitializerContext;
  let coreSetup: CoreSetup;
  let coreStart: CoreStart;
  let setupDeps: Parameters<ScreenshottingPlugin['setup']>[1];
  let plugin: ScreenshottingPlugin;

  beforeEach(() => {
    const configSchema = {
      browser: { chromium: { disableSandbox: false } },
    };
    initContext = coreMock.createPluginInitializerContext(configSchema);
    coreSetup = coreMock.createSetup({});
    coreStart = coreMock.createStart();
    setupDeps = {
      screenshotMode: {} as ScreenshotModePluginSetup,
    };
    plugin = new ScreenshottingPlugin(initContext);
  });

  describe('setup', () => {
    test('returns a setup contract', async () => {
      const setupContract = plugin.setup(coreSetup, setupDeps);
      expect(setupContract).toEqual({});
    });

    test('handles setup issues', async () => {
      (install as jest.Mock).mockRejectedValue(`Unsupported platform!!!`);

      const setupContract = plugin.setup(coreSetup, setupDeps);
      expect(setupContract).toEqual({});

      await coreSetup.getStartServices();

      const startContract = plugin.start(coreStart);
      expect(startContract).toEqual(
        expect.objectContaining({
          diagnose: expect.any(Function),
          getScreenshots: expect.any(Function),
        })
      );
    });
  });

  describe('start', () => {
    beforeEach(async () => {
      plugin.setup(coreSetup, setupDeps);
      await coreSetup.getStartServices();
    });

    test('returns a start contract', async () => {
      const startContract = plugin.start(coreStart);
      expect(startContract).toEqual(
        expect.objectContaining({
          diagnose: expect.any(Function),
          getScreenshots: expect.any(Function),
        })
      );
    });
  });
});
