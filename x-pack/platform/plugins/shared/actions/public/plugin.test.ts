/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { Plugin } from './plugin';

describe('Actions Plugin', () => {
  describe('setup()', () => {
    const emails = ['bob@elastic.co', 'jim@somewhere.org', 'not an email'];

    it('should allow all the valid emails when not using email allowlist config', async () => {
      const context = coreMock.createPluginInitializerContext({});
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      const validated = pluginSetup.validateEmailAddresses(emails);
      expect(validated).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "jim@somewhere.org",
            "valid": true,
          },
          Object {
            "address": "not an email",
            "reason": "invalid",
            "valid": false,
          },
        ]
      `);
    });

    it('should validate correctly when using email allowlist config', async () => {
      const context = coreMock.createPluginInitializerContext({
        email: { domain_allowlist: ['elastic.co'] },
      });
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      const validated = pluginSetup.validateEmailAddresses(emails);
      expect(validated).toMatchInlineSnapshot(`
        Array [
          Object {
            "address": "bob@elastic.co",
            "valid": true,
          },
          Object {
            "address": "jim@somewhere.org",
            "reason": "notAllowed",
            "valid": false,
          },
          Object {
            "address": "not an email",
            "reason": "invalid",
            "valid": false,
          },
        ]
      `);
    });

    it('returns isWebhookSslWithPfxEnabled if set in kibana config', async () => {
      const context = coreMock.createPluginInitializerContext({
        webhook: {
          ssl: {
            pfx: {
              enabled: false,
            },
          },
        },
      });
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      expect(pluginSetup.isWebhookSslWithPfxEnabled).toBe(false);
    });

    it('returns isEarsEnabled as false when neither config key is set', async () => {
      const context = coreMock.createPluginInitializerContext({});
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      expect(pluginSetup.isEarsEnabled).toBe(false);
    });

    it('returns isEarsEnabled as true when auth.ears.enabled is set', async () => {
      const context = coreMock.createPluginInitializerContext({
        auth: { ears: { enabled: true } },
      });
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      expect(pluginSetup.isEarsEnabled).toBe(true);
    });

    it('falls back to legacy ears.enabled when auth.ears.enabled is not set', async () => {
      const context = coreMock.createPluginInitializerContext({
        ears: { enabled: true },
      });
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      expect(pluginSetup.isEarsEnabled).toBe(true);
    });

    it('auth.ears.enabled takes precedence over legacy ears.enabled', async () => {
      const context = coreMock.createPluginInitializerContext({
        auth: { ears: { enabled: false } },
        ears: { enabled: true },
      });
      const plugin = new Plugin(context);
      const pluginSetup = plugin.setup();
      expect(pluginSetup.isEarsEnabled).toBe(false);
    });
  });
});
