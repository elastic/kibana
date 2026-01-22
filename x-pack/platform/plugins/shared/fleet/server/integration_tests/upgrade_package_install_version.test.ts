/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';

import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import { upgradePackageInstallVersion } from '../services/setup/upgrade_package_install_version';
import {
  FLEET_INSTALL_FORMAT_VERSION,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../constants';
import type { Installation } from '../types';

import { useDockerRegistry, waitForFleetSetup } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

const PACKAGES = ['fleet_server', 'system', 'nginx', 'apache'];

describe('Uprade package install version', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {},
      },
    });

    esServer = await startES();
    const startKibana = async () => {
      const root = createRootWithCorePlugins(
        {
          xpack: {
            fleet: {
              registryUrl,
              packages: [
                {
                  name: 'fleet_server',
                  version: 'latest',
                },
                {
                  name: 'system',
                  version: 'latest',
                },
                {
                  name: 'nginx',
                  version: 'latest',
                },
                {
                  name: 'apache',
                  version: 'latest',
                },
              ],
            },
          },
          logging: {
            appenders: {
              file: {
                type: 'file',
                fileName: logFilePath,
                layout: {
                  type: 'json',
                },
              },
            },
            loggers: [
              {
                name: 'root',
                appenders: ['file'],
              },
              {
                name: 'plugins.fleet',
                level: 'all',
              },
            ],
          },
        },
        { oss: false }
      );

      await root.preboot();
      const coreSetup = await root.setup();
      const coreStart = await root.start();

      return {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
    };
    kbnServer = await startKibana();

    await waitForFleetSetup(kbnServer.root);
  };

  const stopServers = async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  // Share the same servers for all the test to make test a lot faster (but test are not isolated anymore)
  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/227351
  describe.skip('with package installed with a previous format install version', () => {
    let soClient: SavedObjectsClientContract;

    const OUTDATED_PACKAGES = ['nginx', 'apache'];

    beforeAll(async () => {
      soClient = kbnServer.coreStart.savedObjects.getScopedClient(fakeRequest, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
      });

      const res = await soClient.find<Installation>({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        perPage: SO_SEARCH_LIMIT,
      });

      for (const so of res.saved_objects) {
        if (OUTDATED_PACKAGES.includes(so.attributes.name)) {
          await soClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, so.id, {
            install_format_schema_version: '0.0.1',
          });
        }
      }
    });
    it('should upgrade package install version for outdated packages', async () => {
      const now = Date.now();
      await upgradePackageInstallVersion({
        soClient,
        esClient: kbnServer.coreStart.elasticsearch.client.asInternalUser,
        logger: loggerMock.create(),
      });

      const res = await soClient.find<Installation>({
        type: PACKAGES_SAVED_OBJECT_TYPE,
        perPage: SO_SEARCH_LIMIT,
      });

      res.saved_objects.forEach((so) => {
        expect(so.attributes.install_format_schema_version).toBe(FLEET_INSTALL_FORMAT_VERSION);
        if (!PACKAGES.includes(so.attributes.name)) {
          return;
        }

        if (!OUTDATED_PACKAGES.includes(so.attributes.name)) {
          expect(new Date(so.updated_at as string).getTime()).toBeLessThan(now);
        } else {
          expect(new Date(so.updated_at as string).getTime()).toBeGreaterThan(now);
        }
      });
    });
  });
});
