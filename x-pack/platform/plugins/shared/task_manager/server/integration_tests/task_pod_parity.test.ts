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

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
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

const KIBANA_PORT = 5699;
const POD_PORT = 3591;
const POD_TASK_TYPES = ['alerting_v2:*'];

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

/**
 * Runs alerting v2 tasks in a task pod booted from the family manifest, against the same ES as
 * a Kibana that routes those task types to it. Installation stays with Kibana: the pod must not
 * create anything.
 */
describe('task pod parity (alerting_v2 family)', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManager: TaskManagerStartContract;
  let podUrl: string;
  let pod: PodProcess;
  let indicesBeforePod: string[];

  beforeAll(async () => {
    // Boot Kibana first so it installs indices, mappings and data streams; the pod comes after.
    podUrl = `http://localhost:${POD_PORT}`;
    const setup = await setupTestServers({
      server: { port: KIBANA_PORT },
      xpack: {
        encryptedSavedObjects: { encryptionKey: ENCRYPTION_KEY },
        task_manager: { pods: [{ url: podUrl, task_types: POD_TASK_TYPES }] },
      },
    });
    esServer = setup.esServer;
    kibanaServer = setup.kibanaServer;
    taskManager = taskManagerStartSpy.mock.results[0].value;

    indicesBeforePod = await waitForStableIndices(kibanaServer);
    pod = await startPodProcess({ family: 'alerting_v2', port: POD_PORT });
  });

  afterAll(async () => {
    pod?.stop();
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('serves exactly the alerting_v2 task types Kibana registered', async () => {
    const health = (await http(`${podUrl}/health`)).json() as { taskTypes: string[] };
    const registered = taskManager.getRegisteredTypes().filter((t) => t.startsWith('alerting_v2:'));
    expect(health.taskTypes.sort()).toEqual(registered.sort());
  });

  it('runs a rule executor in the pod and writes rule events', async () => {
    await kibanaServer.coreStart.elasticsearch.client.asInternalUser.index({
      index: 'parity-source',
      refresh: true,
      document: { '@timestamp': new Date().toISOString(), host: 'parity-host' },
    });
    const auth = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
    const res = await http(`http://localhost:${KIBANA_PORT}${ALERTING_V2_RULE_API_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'kbn-xsrf': 'x', authorization: auth },
      body: JSON.stringify({
        kind: 'alert',
        metadata: { name: 'parity rule' },
        time_field: '@timestamp',
        schedule: { every: '1m', lookback: '5m' },
        query: {
          base: 'FROM parity-source | STATS c = COUNT(*) BY host',
          breach: { segment: 'WHERE c > 0' },
        },
        recovery: { strategy: 'no_breach' },
        no_data: { strategy: 'keep_last' },
        grouping: { fields: ['host'] },
        state_transition: { pending: { count: 1 }, recovering: { count: 1 } },
      }),
    });
    if (res.status >= 300)
      throw new Error(`create rule: ${res.status} ${JSON.stringify(res.json())}`);
    const rule = res.json() as { id: string };

    await taskManager.runSoon(`alerting_v2:rule_executor:default:${rule.id}`);

    const es = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
    await retry(async () => {
      const found = await es.search({ index: '.rule-events', size: 3, query: { match_all: {} } });
      const total = (found.hits.total as { value: number }).value;
      if (total === 0) {
        const task = await es
          .get({
            index: '.kibana_task_manager',
            id: `task:alerting_v2:rule_executor:default:${rule.id}`,
          })
          .catch((e) => e.message);
        throw new Error(`no rule events; task=${JSON.stringify(task).slice(0, 1500)}`);
      }
      expect(total).toBeGreaterThan(0);
    });
  });

  it('runs the dispatcher in the pod and advances its watermark', async () => {
    const es = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
    const taskId = 'alerting_v2:dispatcher:1.0.0';
    const watermark = async () => {
      const doc = await es.get<{ task: { state: string } }>({
        index: '.kibana_task_manager',
        id: `task:${taskId}`,
      });
      return JSON.parse(doc._source!.task.state).eventWatermark as string | undefined;
    };
    const before = await watermark();
    await taskManager.runSoon(taskId);
    await retry(async () => {
      const after = await watermark();
      expect(after).toBeDefined();
      expect(after).not.toEqual(before);
    });
  });

  it('did not create any index or data stream', async () => {
    const after = await listIndices(kibanaServer);
    const created = after.filter((i) => !indicesBeforePod.includes(i));
    // Not the pod's: the seed index, backing indices of existing data streams, and the user profile
    // index Kibana creates when the test user creates the rule.
    const ours = (i: string) =>
      i === 'parity-source' || i.startsWith('.ds-') || i.startsWith('.security-profile');
    expect(created.filter((i) => !ours(i))).toEqual([]);
  });
});
