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

    if (kbnServer) {
      await kbnServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
    esServer = await startES();

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
          .getUnsafeInternalClient()
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

    describe('With a preconfigured Kafka output that has proxy_id set', () => {
      // Regression test for #267281: Kibana must boot cleanly when a kibana.yml Kafka output
      // specifies proxy_id, and the stored output must have proxy_id cleared to null.
      const kafkaOutputConfig = [
        {
          name: 'Kafka with proxy',
          type: 'kafka',
          id: 'output-kafka-with-proxy',
          is_default: false,
          is_default_monitoring: false,
          hosts: ['kafka:9092'],
          topic: 'test',
          auth_type: 'none',
          proxy_id: 'non-existent-proxy',
        },
      ];

      let versionAfterFirstBoot: string;

      beforeAll(async () => {
        await startServers(kafkaOutputConfig);
      });

      afterAll(async () => {
        await stopServers();
      });

      it('should boot without errors and store the Kafka output with proxy_id cleared', async () => {
        const outputs = await kbnServer.coreStart.savedObjects
          .getUnsafeInternalClient()
          .find<OutputSOAttributes>({
            type: 'ingest-outputs',
            perPage: 10000,
          });

        const kafkaOutput = outputs.saved_objects.find(
          (so) => so.attributes.output_id === 'output-kafka-with-proxy'
        );

        expect(kafkaOutput).toBeDefined();
        expect(kafkaOutput!.attributes.type).toBe('kafka');
        // proxy_id must be cleared — Kafka does not support proxies (#267281)
        expect(kafkaOutput!.attributes.proxy_id).toBeNull();

        // Capture version to detect spurious updates on the next boot
        versionAfterFirstBoot = kafkaOutput!.version!;
      });

      it('should not trigger a repeated update on a second boot', async () => {
        // Restart Kibana with the same config — the change-detection guard should see no diff
        // on proxy_id for Kafka and not re-update the output.
        await startServers(kafkaOutputConfig);

        const outputs = await kbnServer.coreStart.savedObjects
          .getUnsafeInternalClient()
          .find<OutputSOAttributes>({
            type: 'ingest-outputs',
            perPage: 10000,
          });

        const kafkaOutput = outputs.saved_objects.find(
          (so) => so.attributes.output_id === 'output-kafka-with-proxy'
        );

        expect(kafkaOutput).toBeDefined();
        // Version must be unchanged — a different version means a spurious update occurred
        expect(kafkaOutput!.version).toBe(versionAfterFirstBoot);
      });
    });
  });
});
