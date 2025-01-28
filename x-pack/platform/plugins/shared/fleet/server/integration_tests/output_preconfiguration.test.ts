/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';

import type { OutputSOAttributes } from '../types';

import { useDockerRegistry, waitForFleetSetup } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

describe('Fleet preconfigured outputs', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async (outputs: any) => {
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
    if (kbnServer) {
      await kbnServer.stop();
    }

    const root = createRootWithCorePlugins(
      {
        xpack: {
          fleet: {
            outputs,
            registryUrl,
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

    kbnServer = {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    };
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

  describe('Preconfigured outputs', () => {
    describe('With a preconfigured monitoring output', () => {
      beforeAll(async () => {
        await startServers([
          {
            name: 'Test output',
            is_default_monitoring: true,
            type: 'elasticsearch',
            id: 'output-default-monitoring',
            hosts: ['http://elasticsearch-alternative-url:9200'],
          },
        ]);
      });

      afterAll(async () => {
        await stopServers();
      });

      it('Should create a default output and the default preconfigured output', async () => {
        const outputs = await kbnServer.coreStart.savedObjects
          .createInternalRepository()
          .find<OutputSOAttributes>({
            type: 'ingest-outputs',
            perPage: 10000,
          });

        expect(outputs.total).toBe(2);
        expect(outputs.saved_objects.filter((so) => so.attributes.is_default)).toHaveLength(1);
        expect(
          outputs.saved_objects.filter((so) => so.attributes.is_default_monitoring)
        ).toHaveLength(1);

        const defaultDataOutput = outputs.saved_objects.find((so) => so.attributes.is_default);
        const defaultMonitoringOutput = outputs.saved_objects.find(
          (so) => so.attributes.is_default_monitoring
        );
        expect(defaultDataOutput!.id).not.toBe(defaultMonitoringOutput!.id);
        expect(defaultDataOutput!.attributes.is_default_monitoring).toBeFalsy();
      });
    });
  });
});
