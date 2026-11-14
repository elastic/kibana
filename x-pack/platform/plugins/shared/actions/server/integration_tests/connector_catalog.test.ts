/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncomingHttpHeaders, Server } from 'http';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import axios from 'axios';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { PluginStartContract } from '../plugin';
import {
  CONNECTOR_TYPE_CATALOG_INDEX,
  createConnectorCatalogStorage,
} from '../lib/connector_catalog';
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

// The shipped `.abuseipdb` type is registered in-tree, so the seeded copy needs its own id.
const CATALOG_TYPE_ID = '.declarative-abuseipdb';
const CONNECTOR_ID = 'catalog-spec-connector';
const EVENT_LOG_INDEX = '.kibana-event-log-*';

interface ReceivedRequest {
  method?: string;
  path: string;
  headers: IncomingHttpHeaders;
}

interface ExecuteEventSource {
  event?: { outcome?: string };
  kibana?: { saved_objects?: Array<{ id?: string }> };
}

describe('Connector catalog at start', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let actionsStart: PluginStartContract;
  let mockApi: Server;
  let savedAxiosDefaultsAdapter: typeof axios.defaults.adapter;
  const receivedRequests: ReceivedRequest[] = [];

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
    // needed to prevent the dreaded Error: Cross origin http://localhost forbidden
    // see: https://github.com/axios/axios/issues/1754#issuecomment-572778305
    savedAxiosDefaultsAdapter = axios.defaults.adapter;
    axios.defaults.adapter = 'http';

    mockApi = createServer((request, response) => {
      const { method, url = '', headers } = request;
      receivedRequests.push({ method, path: url.split('?')[0], headers });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { ipAddress: '8.8.8.8', abuseConfidenceScore: 0 } }));
    });
    await new Promise<void>((resolve) => mockApi.listen(0, '127.0.0.1', resolve));
    const { port } = mockApi.address() as AddressInfo;

    const setupResult = await setupTestServers(
      {
        feature_flags: { overrides: { [ACTIONS_CONNECTOR_CATALOG_ENABLED_FLAG]: true } },
        xpack: {
          actions: {
            preconfigured: {
              [CONNECTOR_ID]: {
                name: 'Catalog spec connector',
                actionTypeId: CATALOG_TYPE_ID,
                config: { baseUrl: `http://127.0.0.1:${port}` },
                secrets: { authType: 'api_key_header', Key: 'test-key' },
              },
            },
          },
        },
      },
      {
        beforeKibanaStart: async (esClient) => {
          const storage = createConnectorCatalogStorage({
            esClient,
            logger: loggingSystemMock.createLogger(),
          });
          // The adapter creates the template and the index on the first write.
          await storage.createDefinition({
            connectorId: CATALOG_TYPE_ID,
            version: '1.1.0',
            yaml: loadFixture('abuseipdb-1.1.0.yaml').replace(
              'id: .abuseipdb',
              `id: ${CATALOG_TYPE_ID}`
            ),
            contentHash: 'sha256:abuseipdb',
            catalogVersion: '2026.11.1',
          });
          await storage.replaceManifest({
            raw: JSON.stringify({ connectors: [{ id: CATALOG_TYPE_ID, version: '1.1.0' }] }),
          });
          await esClient.indices.refresh({ index: CONNECTOR_TYPE_CATALOG_INDEX });
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
    axios.defaults.adapter = savedAxiosDefaultsAdapter;
    if (mockApi) {
      await new Promise((resolve) => mockApi.close(resolve));
    }
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
          params: { subAction: 'checkIp', subActionParams: { ipAddress: '8.8.8.8' } },
        },
      ]);
    expect(response.errors).toBe(false);

    const events = await waitFor(findSuccessfulExecuteEvents, (found) => found.length > 0);

    expect(events.length).toBeGreaterThan(0);

    const checkIpRequests = receivedRequests.filter(
      ({ method, path }) => method === 'GET' && path === '/api/v2/check'
    );
    expect(checkIpRequests.length).toBeGreaterThan(0);
    expect(checkIpRequests[0].headers.key).toBe('test-key');
  });
});
