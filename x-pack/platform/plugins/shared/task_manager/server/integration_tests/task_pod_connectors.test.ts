/**
 * @jest-environment node
 */

/* eslint-disable @kbn/eslint/require-license-header */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import {
  ENCRYPTION_KEY,
  http,
  listIndices,
  retry,
  setupTestServers,
  startPodProcess,
  waitForStableIndices,
  type PodProcess,
} from './lib';

const KIBANA_PORT = 5698;
const POD_PORT = 3592;
// Connector type ids start with a dot, which keeps the cleanup and telemetry tasks in Kibana.
const POD_TASK_TYPES = ['actions:.*'];

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
// Actions depends on Task Manager, so Task Manager's TypeScript project cannot reference it: load it
// untyped, only to observe where connector runs happen.
const { ActionsPlugin } = jest.requireActual('@kbn/actions-plugin/server/plugin');
const { TaskRunnerFactory } = jest.requireActual(
  '@kbn/actions-plugin/server/lib/task_runner_factory'
);
const actionsStartSpy = jest.spyOn(ActionsPlugin.prototype, 'start');
const kibanaRunSpy = jest.spyOn(TaskRunnerFactory.prototype, 'create');

/**
 * Runs connector executions in a task pod, against the same ES as a Kibana that routes
 * `actions:.*` to it. Preconfigured connectors are pod inputs: the pod needs the same ones.
 */
describe('task pod parity (connectors family)', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManager: TaskManagerStartContract;
  let pod: PodProcess;
  let hookServer: Server;
  let indicesBeforePod: string[];
  const received: string[] = [];

  beforeAll(async () => {
    hookServer = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        received.push(body);
        res.end('ok');
      });
    });
    await new Promise<void>((resolve) => hookServer.listen(0, resolve));
    const hookUrl = `http://localhost:${(hookServer.address() as AddressInfo).port}/hook`;

    const preconfigured = {
      'parity-webhook': {
        name: 'parity webhook',
        actionTypeId: '.webhook',
        config: { url: hookUrl, method: 'post', hasAuth: false },
        secrets: {},
      },
      'parity-log': {
        name: 'parity log',
        actionTypeId: '.server-log',
        config: {},
        secrets: {},
      },
    };

    const podUrl = `http://localhost:${POD_PORT}`;
    const setup = await setupTestServers({
      server: { port: KIBANA_PORT },
      xpack: {
        encryptedSavedObjects: { encryptionKey: ENCRYPTION_KEY },
        actions: { preconfigured },
        task_manager: { pods: [{ url: podUrl, task_types: POD_TASK_TYPES }] },
      },
    });
    esServer = setup.esServer;
    kibanaServer = setup.kibanaServer;
    taskManager = taskManagerStartSpy.mock.results[0].value;

    indicesBeforePod = await waitForStableIndices(kibanaServer);
    pod = await startPodProcess({
      family: 'connectors',
      port: POD_PORT,
      podConfig: { 'xpack.actions.preconfigured': preconfigured },
    });
  });

  afterAll(async () => {
    pod?.stop();
    hookServer?.close();
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('serves connector task types Kibana registered, and none that need privileges', async () => {
    const health = (await http(`${pod.url}/health`)).json() as { taskTypes: string[] };
    const kibanaTypes = taskManager.getRegisteredTypes().filter((t) => t.startsWith('actions:.'));
    expect(health.taskTypes.length).toBeGreaterThan(20);
    expect(health.taskTypes.every((t) => kibanaTypes.includes(t))).toBe(true);
    expect(health.taskTypes).toEqual(
      expect.arrayContaining(['actions:.webhook', 'actions:.server-log'])
    );
    // Sub-feature connector types need Kibana privileges, which a pod cannot check.
    expect(kibanaTypes).toContain('actions:.sentinelone');
    expect(health.taskTypes).not.toContain('actions:.sentinelone');
    // Cleanup and telemetry tasks stay in Kibana.
    expect(health.taskTypes.filter((t) => !t.startsWith('actions:.'))).toEqual([]);
  });

  it('runs a webhook execution in the pod, not in Kibana', async () => {
    const actions = actionsStartSpy.mock.results[0].value;
    kibanaRunSpy.mockClear();

    const { errors } = await actions
      .getUnsecuredActionsClient()
      .bulkEnqueueExecution('notifications', [
        { id: 'parity-webhook', params: { body: JSON.stringify({ from: 'parity' }) } },
      ]);
    expect(errors).toBe(false);

    await retry(
      async () => {
        expect(received.some((body) => body.includes('"from":"parity"'))).toBe(true);
      },
      { times: 120, intervalMs: 500 }
    );
    // Task Manager sent the run to the pod; Kibana's task runner factory never ran it.
    expect(kibanaRunSpy).not.toHaveBeenCalled();
  });

  it('writes the execution to the event log', async () => {
    const es = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
    await retry(
      async () => {
        const found = await es.search({
          index: '.kibana-event-log-*',
          size: 5,
          query: {
            bool: {
              filter: [
                { term: { 'event.provider': 'actions' } },
                { term: { 'event.action': 'execute' } },
                { match_phrase: { message: 'parity-webhook' } },
              ],
            },
          },
        });
        expect((found.hits.total as { value: number }).value).toBeGreaterThan(0);
      },
      { times: 60, intervalMs: 1000 }
    );
  });

  it('did not create any index or data stream', async () => {
    const created = (await listIndices(kibanaServer)).filter((i) => !indicesBeforePod.includes(i));
    const notThePods = (i: string) => i.startsWith('.ds-') || i.startsWith('.security-profile');
    expect(created.filter((i) => !notThePods(i))).toEqual([]);
  });
});
