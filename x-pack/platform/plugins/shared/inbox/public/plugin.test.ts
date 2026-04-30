/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { InboxPublicPlugin } from './plugin';
import type { InboxClientConfig, InboxSetupDependencies } from './types';
import { APP_PATH, PLUGIN_ID } from '../common';

const createPlugin = (config: InboxClientConfig) => {
  const context = coreMock.createPluginInitializerContext(config);
  return new InboxPublicPlugin(context);
};

const noopSetupDeps: InboxSetupDependencies = {} as InboxSetupDependencies;

describe('InboxPublicPlugin', () => {
  describe('setup()', () => {
    it('does NOT register the Inbox application when the plugin is disabled', () => {
      const coreSetup = coreMock.createSetup();
      const plugin = createPlugin({ enabled: false });

      const contract = plugin.setup(coreSetup, noopSetupDeps);

      expect(coreSetup.application.register).not.toHaveBeenCalled();
      expect(contract).toEqual({});
    });

    it('registers a standalone Inbox application at APP_PATH when enabled', () => {
      const coreSetup = coreMock.createSetup();
      const plugin = createPlugin({ enabled: true });

      plugin.setup(coreSetup, noopSetupDeps);

      expect(coreSetup.application.register).toHaveBeenCalledTimes(1);
      const [registration] = coreSetup.application.register.mock.calls[0];
      expect(registration).toEqual(
        expect.objectContaining({
          id: PLUGIN_ID,
          appRoute: APP_PATH,
          euiIconType: 'email',
          mount: expect.any(Function),
        })
      );
    });

    it('exposes the app in the side nav and global search so it can be linked from Security Solution', () => {
      const coreSetup = coreMock.createSetup();
      const plugin = createPlugin({ enabled: true });

      plugin.setup(coreSetup, noopSetupDeps);

      const [registration] = coreSetup.application.register.mock.calls[0];
      expect(registration.visibleIn).toEqual(expect.arrayContaining(['sideNav', 'globalSearch']));
    });
  });

  describe('start()', () => {
    it('returns the (currently empty) public start contract without throwing', () => {
      const coreStart = coreMock.createStart();
      const plugin = createPlugin({ enabled: true });

      expect(plugin.start(coreStart, {})).toEqual({});
    });
  });
});
