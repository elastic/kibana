/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import type { UsageApiConfigType } from './config';
import { UsageApiPlugin } from './plugin';

describe('Usage API Plugin', () => {
  const setupPlugin = (configParts: Partial<UsageApiConfigType> = {}) => {
    const initContext = coreMock.createPluginInitializerContext({
      enabled: false,
      ...configParts,
    });
    const plugin = new UsageApiPlugin(initContext);

    const setup = plugin.setup();
    const start = plugin.start();

    return { setup, start };
  };

  describe('#setup', () => {
    describe('interface', () => {
      it('it should return enabled false when no config is provided', () => {
        const { setup } = setupPlugin();
        expect(setup).toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "enabled": false,
              "tls": undefined,
              "url": undefined,
            },
          }
        `);
      });

      it('it should return enabled false when config is provided but url is not set', () => {
        const { setup } = setupPlugin({ enabled: true });
        expect(setup).toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "enabled": false,
              "tls": undefined,
              "url": undefined,
            },
          }
        `);
      });

      it('it should return enabled true when config is provided and url is set', () => {
        const { setup } = setupPlugin({ enabled: true, url: 'https://usage-api.example' });
        expect(setup).toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "enabled": true,
              "tls": undefined,
              "url": "https://usage-api.example",
            },
          }
        `);
      });

      it('it should return tls when tls is provided', () => {
        const { setup } = setupPlugin({
          enabled: true,
          url: 'https://usage-api.example',
          tls: { certificate: 'certificate', key: 'key', ca: 'ca' },
        });
        expect(setup).toMatchInlineSnapshot(`
          Object {
            "config": Object {
              "enabled": true,
              "tls": Object {
                "ca": "ca",
                "certificate": "certificate",
                "key": "key",
              },
              "url": "https://usage-api.example",
            },
          }
        `);
      });
    });
  });

  describe('#start', () => {
    describe('interface', () => {
      it('snapshot', () => {
        const { start } = setupPlugin();
        expect(start).toMatchInlineSnapshot(`undefined`);
      });
    });
  });
});
