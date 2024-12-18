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
  });
});
