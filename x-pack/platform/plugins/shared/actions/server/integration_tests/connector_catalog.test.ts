/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { PluginStartContract } from '../plugin';
import { CONNECTOR_CATALOG_INDEX, createConnectorCatalogStorage } from '../lib/connector_catalog';
import { loadFixture } from '../lib/declarative_connectors/__fixtures__/load_fixture';
import { ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG } from '../../common';
import { setupTestServers } from './lib';

const mockCaptured: { start?: PluginStartContract } = {};

// Captures the real start contract. The plugin loader imports `ActionsPlugin` from './plugin'.
jest.mock('../plugin', () => {
  const actual = jest.requireActual('../plugin');
  class CapturingActionsPlugin extends actual.ActionsPlugin {
    public start(...args: unknown[]) {
      const contract = super.start(...args);
      mockCaptured.start = contract;
      return contract;
    }
  }
  return { ...actual, ActionsPlugin: CapturingActionsPlugin };
});

const CATALOG_TYPE_ID = '.declarative-abuseipdb';
const CONNECTOR_ID = 'catalog-spec-connector';
const EVENT_LOG_INDEX = '.kibana-event-log-*';

interface ExecuteEventSource {
  event?: { outcome?: string };
  kibana?: { saved_objects?: Array<{ id?: string }> };
}

describe('Connector catalog at start', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let actionsStart: PluginStartContract;

  const findSuccessfulExecuteEvents = async (): Promise<ExecuteEventSource[]> => {
    const esClient: ElasticsearchClient = esServer.es.getClient();
    try {
      const response = await esClient.search<ExecuteEventSource>({
        index: EVENT_LOG_INDEX,
        size: 100,
        query: {
          bool: {
            filter: [
              { term: { 'event.provider': 'actions' } },
              { term: { 'event.action': 'execute' } },
            ],
          },
        },
      });
      return response.hits.hits
        .map(({ _source }) => _source)
        .filter((source): source is ExecuteEventSource => source !== undefined)
        .filter(
          (source) =>
            source.event?.outcome === 'success' &&
            source.kibana?.saved_objects?.some(({ id }) => id === CONNECTOR_ID)
        );
    } catch (error) {
      // The event log index is created lazily.
      return [];
    }
  };

  const waitFor = async <T>(read: () => Promise<T>, isDone: (value: T) => boolean): Promise<T> => {
    const deadline = Date.now() + 60_000;
    let value = await read();
    while (!isDone(value) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      value = await read();
    }
    return value;
  };

  beforeAll(async () => {
    const setupResult = await setupTestServers(
      {
        feature_flags: { overrides: { [ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG]: true } },
        xpack: {
          actions: {
            preconfigured: {
              [CONNECTOR_ID]: {
                name: 'Catalog spec connector',
                actionTypeId: CATALOG_TYPE_ID,
                config: {},
                secrets: { authType: 'none' },
              },
            },
          },
        },
      },
      {
        beforeKibanaStart: async (esClient) => {
          const storage = createConnectorCatalogStorage({ esClient });
          await storage.ensureIndex();
          await storage.createDefinition({
            connectorId: CATALOG_TYPE_ID,
            version: '1.1.0',
            yaml: loadFixture('abuseipdb-1.1.0.yaml'),
            contentHash: 'sha256:abuseipdb',
            catalogVersion: '2026.11.1',
          });
          await storage.replaceManifest({
            raw: JSON.stringify({ connectors: [{ id: CATALOG_TYPE_ID, version: '1.1.0' }] }),
          });
          await esClient.indices.refresh({ index: CONNECTOR_CATALOG_INDEX });
        },
      }
    );
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    if (!mockCaptured.start) {
      throw new Error('The actions start contract was not captured.');
    }
    actionsStart = mockCaptured.start;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('registers the seeded type and runs it through Task Manager', async () => {
    await actionsStart.whenCatalogReady();

    expect(actionsStart.getAllTypes()).toContain(CATALOG_TYPE_ID);

    const response = await actionsStart
      .getUnsecuredActionsClient()
      .bulkEnqueueExecution('functional_tester', [
        {
          id: CONNECTOR_ID,
          params: { subAction: 'placeholder', subActionParams: {} },
        },
      ]);
    expect(response.errors).toBe(false);

    const events = await waitFor(findSuccessfulExecuteEvents, (found) => found.length > 0);

    expect(events.length).toBeGreaterThan(0);
  });
});
