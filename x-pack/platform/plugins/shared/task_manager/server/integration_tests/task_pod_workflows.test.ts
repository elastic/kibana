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
import { TaskManagerPlugin, type TaskManagerStartContract } from '../plugin';
import {
  ENCRYPTION_KEY,
  http,
  listIndices,
  startModelSimulator,
  retry,
  setupTestServers,
  startPodProcess,
  waitForStableIndices,
  type PodProcess,
} from './lib';

// Counts the workflow runs Kibana itself performs. Workflows depend on Task Manager, so this loads
// the engine untyped: its TypeScript project cannot be referenced from here.
jest.mock('@kbn/workflows-execution-engine/server/execution_functions', () => {
  const actual = jest.requireActual('@kbn/workflows-execution-engine/server/execution_functions');
  return { ...actual, runWorkflow: jest.fn(actual.runWorkflow) };
});
const { runWorkflow: kibanaRunWorkflow } = jest.requireMock(
  '@kbn/workflows-execution-engine/server/execution_functions'
) as { runWorkflow: jest.Mock };

const KIBANA_PORT = 5697;
const POD_PORT = 3593;
const WORKFLOW_TASK_TYPES = ['workflow:run', 'workflow:resume', 'workflow:scheduled'];

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');

const WORKFLOW_YAML = `
name: pod parity
enabled: true
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: hello from a task pod
  - name: second
    type: console
    with:
      message: and again
  - name: ask
    type: ai.prompt
    connector-id: parity-llm
    with:
      prompt: say hello
  - name: agent
    type: ai.agent
    connector-id: parity-llm
    with:
      message: say hello as an agent
`;

/**
 * Runs workflows in a task pod, against the same ES as a Kibana that routes the workflow task types
 * to it. The engine in the pod is the one Kibana runs, built from the same parts.
 */
describe('task pod parity (workflows family)', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManager: TaskManagerStartContract;
  let pod: PodProcess;
  let simulator: Awaited<ReturnType<typeof startModelSimulator>>;
  let indicesBeforePod: string[];
  const auth = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
  const kibana = (path: string, method = 'GET', body?: unknown) =>
    http(`http://localhost:${KIBANA_PORT}${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'kbn-xsrf': 'x', authorization: auth },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  beforeAll(async () => {
    simulator = await startModelSimulator();
    const preconfigured = {
      'parity-llm': {
        name: 'parity llm',
        actionTypeId: '.gen-ai',
        config: { apiProvider: 'OpenAI', apiUrl: `${simulator.url}/v1/chat/completions` },
        secrets: { apiKey: 'sim' },
      },
    };
    const podUrl = `http://localhost:${POD_PORT}`;
    const setup = await setupTestServers({
      server: { port: KIBANA_PORT },
      xpack: {
        encryptedSavedObjects: { encryptionKey: ENCRYPTION_KEY },
        actions: { preconfigured },
        task_manager: { pods: [{ url: podUrl, task_types: WORKFLOW_TASK_TYPES }] },
      },
    });
    esServer = setup.esServer;
    kibanaServer = setup.kibanaServer;
    taskManager = taskManagerStartSpy.mock.results[0].value;

    indicesBeforePod = await waitForStableIndices(kibanaServer);
    pod = await startPodProcess({
      family: 'workflows',
      port: POD_PORT,
      // Agent Builder's steps write to a restricted system index, which only the system user may.
      esUser: { username: 'kibana_system', password: 'changeme' },
      podConfig: { 'xpack.actions.preconfigured': preconfigured },
    });
  });

  afterAll(async () => {
    pod?.stop();
    simulator?.server.close();
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('serves the workflow task types Kibana registered', async () => {
    const health = (await http(`${pod.url}/health`)).json() as { taskTypes: string[] };
    const registered = taskManager.getRegisteredTypes();
    for (const type of WORKFLOW_TASK_TYPES) {
      expect(registered).toContain(type);
      expect(health.taskTypes).toContain(type);
    }
  });

  it('runs a workflow in the pod, not in Kibana', async () => {
    const created = await kibana('/api/workflows/workflow', 'POST', { yaml: WORKFLOW_YAML });
    if (created.status >= 300)
      throw new Error(`create: ${created.status} ${JSON.stringify(created.json())}`);
    const { id } = created.json() as { id: string };

    kibanaRunWorkflow.mockClear();
    const run = await kibana(`/api/workflows/workflow/${id}/run`, 'POST', { inputs: {} });
    if (run.status >= 300) throw new Error(`run: ${run.status} ${JSON.stringify(run.json())}`);
    const { workflowExecutionId } = run.json() as { workflowExecutionId: string };

    const es = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
    await retry(
      async () => {
        const execution = await es.get<{ status: string; error?: unknown }>({
          index: '.workflows-executions',
          id: workflowExecutionId,
        });
        if (execution._source?.status !== 'completed') {
          throw new Error(
            `execution ${execution._source?.status}: ${JSON.stringify(execution._source?.error)}`
          );
        }
      },
      { times: 120, intervalMs: 1000 }
    );

    await retry(
      async () => {
        const steps = await es.search({
          index: '.workflows-step-executions',
          query: { query_string: { query: `"${workflowExecutionId}"` } },
          size: 10,
        });
        expect((steps.hits.total as { value: number }).value).toBeGreaterThanOrEqual(2);
        // The agent step is Agent Builder's own: it must be in the pod for the run to complete.
      },
      { times: 30, intervalMs: 1000 }
    );
    // Task Manager sent the run to the pod; Kibana's engine never ran it.
    // The AI step reached the model from the pod.
    expect(simulator.requests.length).toBeGreaterThan(0);
    expect(kibanaRunWorkflow).not.toHaveBeenCalled();
  });

  it('did not create any index or data stream', async () => {
    const created = (await listIndices(kibanaServer)).filter((i) => !indicesBeforePod.includes(i));
    const notThePods = (i: string) =>
      i.startsWith('.ds-') ||
      i.startsWith('.security-profile') ||
      i.startsWith('.ai-index') ||
      // Agent Builder creates its storage on first use, in Kibana too.
      i.startsWith('.chat-');
    expect(created.filter((i) => !notThePods(i))).toEqual([]);
  });
});
