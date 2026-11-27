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

import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fetch as undiciFetch } from 'undici';
import { REPO_ROOT } from '@kbn/repo-info';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { Client } from '@elastic/elasticsearch';
import { elasticsearchConfigFromEnv } from '../task_process/es_config';
import { RemoteTaskRunner } from '../task_process/remote_task_runner';
import { TaskProcessSupervisor } from '../task_process/supervisor';
import { backgroundTaskNodeMapping, taskMappings } from '../saved_objects/mappings';
import {
  BACKGROUND_TASK_NODE_SO_NAME,
  backgroundTaskNodeType,
} from '../saved_objects/background_task_node_type';
import { retry } from './lib';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getTaskBundleEntries, buildTaskBundle } = require(join(
  REPO_ROOT,
  'src/dev/task_bundles/build'
));

const MARK_REMOVED = 'task_manager:mark_removed_tasks_as_unrecognized';
const DELETE_NODES = 'task_manager:delete_inactive_background_task_nodes';
const INDEX = backgroundTaskNodeType.indexPattern!;
const DELETE_BUNDLE = 'taskManager__delete_inactive_nodes.js';
const KIBANA_VERSION = '9.9.9';

/**
 * Builds the bundles of Task Manager's own task types and runs them the way Kibana does: forked
 * by the supervisor with the Elasticsearch connection sent over the fork channel, reached by
 * `RemoteTaskRunner`. The task code runs in the child process against a real cluster. (Booting all
 * of Kibana is not needed to prove this; plugin wiring is covered by unit tests.)
 */
describe('task types served from bundles', () => {
  let esServer: TestElasticsearchUtils;
  let es: Client;
  let supervisor: TaskProcessSupervisor;

  const run = async (taskType: string, id: string) => {
    const pod = supervisor.getRoute(taskType)!;
    expect(pod).toBeDefined();
    return new RemoteTaskRunner({
      route: pod,
      request: {
        taskType,
        taskInstance: { id, taskType, params: {}, state: {} },
        executionUuid: `${id}-${Date.now()}`,
        kibanaVersion: KIBANA_VERSION,
      },
      timeoutMs: 30000,
      setCustomTaskRunEventFields: jest.fn(),
      fetchFn: undiciFetch as unknown as typeof fetch,
    }).run();
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    es = esServer.es.getClient();

    // The index and aliases Kibana's migrator would have created: the saved objects repository
    // addresses the alias of its own version, which the process takes from Kibana.
    await es.indices.create({
      index: `${INDEX}_${KIBANA_VERSION}_001`,
      aliases: { [INDEX]: {}, [`${INDEX}_${KIBANA_VERSION}`]: {} },
      mappings: {
        dynamic: false,
        properties: {
          type: { type: 'keyword' },
          updated_at: { type: 'date' },
          task: taskMappings,
          [BACKGROUND_TASK_NODE_SO_NAME]: backgroundTaskNodeMapping,
        },
      },
    });

    const bundleDir = mkdtempSync(join(tmpdir(), 'task-bundles-'));
    const entries = getTaskBundleEntries().filter(
      ({ pluginId }: { pluginId: string }) => pluginId === 'taskManager'
    );
    const built = await Promise.all(
      entries.map((entry: unknown) => buildTaskBundle({ entry, outDir: bundleDir }))
    );
    const typeByBundle = new Map([
      ['taskManager__delete_inactive_nodes', DELETE_NODES],
      ['taskManager__mark_removed_tasks_as_unrecognized', MARK_REMOVED],
    ]);
    writeFileSync(
      join(bundleDir, 'manifest.json'),
      JSON.stringify({
        bundles: Object.fromEntries(
          built.map(({ name }: { name: string }) => [
            name,
            { file: `${name}.js`, taskType: typeByBundle.get(name) },
          ])
        ),
      })
    );

    supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: bundleDir,
        kibanaVersion: KIBANA_VERSION,
        getElasticsearchConfig: () =>
          elasticsearchConfigFromEnv({
            ES_URL: esServer.hosts[0],
            ES_USERNAME: esServer.username,
            ES_PASSWORD: esServer.password,
          }),
      },
      logger: loggingSystemMock.createLogger(),
    });
    supervisor.start();
  });

  afterAll(async () => {
    await supervisor?.stop();
    await esServer?.stop();
  });

  it('marks removed tasks as unrecognized from a task process', async () => {
    await es.index({
      index: INDEX,
      id: 'task:removed-1',
      refresh: 'wait_for',
      document: {
        type: 'task',
        updated_at: new Date().toISOString(),
        task: {
          taskType: 'sampleTaskRemovedType',
          status: 'idle',
          runAt: new Date().toISOString(),
        },
      },
    });

    await expect(run(MARK_REMOVED, 'mark_removed_tasks_as_unrecognized')).resolves.toEqual({
      state: {},
      schedule: { interval: '1h' },
    });

    const doc = await es.get<{ task: { status: string } }>({ index: INDEX, id: 'task:removed-1' });
    expect(doc._source?.task.status).toBe('unrecognized');
  });

  it('starts a process for each run and stops it when the run ends', async () => {
    const children = () =>
      execSync(`pgrep -f "${DELETE_BUNDLE}" || true`, { encoding: 'utf8' }).trim();
    expect(children()).toBe('');
    await run(DELETE_NODES, 'delete_inactive_background_task_nodes');
    await retry(async () => expect(children()).toBe(''));
    await expect(run(DELETE_NODES, 'delete_inactive_background_task_nodes')).resolves.toBeDefined();
  });

  it('deletes inactive nodes through saved objects from a task process', async () => {
    const node = (id: string, lastSeen: Date) =>
      es.index({
        index: INDEX,
        id: `${BACKGROUND_TASK_NODE_SO_NAME}:${id}`,
        refresh: 'wait_for',
        document: {
          type: BACKGROUND_TASK_NODE_SO_NAME,
          updated_at: new Date().toISOString(),
          [BACKGROUND_TASK_NODE_SO_NAME]: { id, last_seen: lastSeen.toISOString() },
        },
      });
    await node('inactive', new Date(Date.now() - 60 * 60 * 1000));
    await node('active', new Date());

    await expect(run(DELETE_NODES, 'delete_inactive_background_task_nodes')).resolves.toEqual({
      state: {},
      schedule: { interval: '1m' },
    });

    await expect(
      es.exists({ index: INDEX, id: `${BACKGROUND_TASK_NODE_SO_NAME}:inactive` })
    ).resolves.toBe(false);
    await expect(
      es.exists({ index: INDEX, id: `${BACKGROUND_TASK_NODE_SO_NAME}:active` })
    ).resolves.toBe(true);
  });
});
