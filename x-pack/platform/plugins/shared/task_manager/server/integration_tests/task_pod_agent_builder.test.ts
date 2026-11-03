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

import { randomUUID } from 'crypto';
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
  setupTestServers,
  startPodProcess,
  waitForStableIndices,
  type PodProcess,
} from './lib';

// Agent builder depends on Task Manager, so its TypeScript project cannot be referenced from here:
// load it untyped, only to see whether Kibana itself runs an agent.
const { AgentBuilderPlugin } = jest.requireActual('@kbn/agent-builder-plugin/server/plugin');

const KIBANA_PORT = 5696;
const POD_PORT = 3594;
const REPLY = 'Hello from the simulator';

const taskManagerStartSpy = jest.spyOn(TaskManagerPlugin.prototype, 'start');
const agentBuilderStartSpy = jest.spyOn(AgentBuilderPlugin.prototype, 'start');

/** An OpenAI chat completions endpoint that answers every request with `REPLY`. */
const startModelSimulator = async () => {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      requests.push(body);
      const parsed = body ? JSON.parse(body) : {};
      const base = { id: 'chatcmpl-sim', created: 1, model: 'sim' };
      const usage = { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 };
      if (parsed.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        const chunk = (delta: object, finish: string | null, extra: object = {}) =>
          `data: ${JSON.stringify({
            ...base,
            object: 'chat.completion.chunk',
            choices: [{ index: 0, delta, finish_reason: finish }],
            ...extra,
          })}\n\n`;
        res.write(chunk({ role: 'assistant', content: REPLY }, null));
        res.write(chunk({}, 'stop', { usage }));
        res.end('data: [DONE]\n\n');
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            ...base,
            object: 'chat.completion',
            choices: [
              { index: 0, message: { role: 'assistant', content: REPLY }, finish_reason: 'stop' },
            ],
            usage,
          })
        );
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  return { server, requests, url: `http://localhost:${(server.address() as AddressInfo).port}` };
};

/**
 * Runs an agent in a task pod, against the same ES as a Kibana that routes `agent-builder:run-agent`
 * to it. The model is a local simulator behind a preconfigured connector, which the pod needs too.
 */
describe('task pod parity (agent builder family)', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let taskManager: TaskManagerStartContract;
  let pod: PodProcess;
  let simulator: { server: Server; requests: string[]; url: string };
  let indicesBeforePod: string[];
  const auth = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;

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
        task_manager: { pods: [{ url: podUrl, task_types: ['agent-builder:run-agent'] }] },
      },
    });
    esServer = setup.esServer;
    kibanaServer = setup.kibanaServer;
    taskManager = taskManagerStartSpy.mock.results[0].value;

    indicesBeforePod = await waitForStableIndices(kibanaServer);
    pod = await startPodProcess({
      family: 'agent_builder',
      port: POD_PORT,
      podConfig: { 'xpack.actions.preconfigured': preconfigured },
      // Agent builder keeps its executions in a restricted system index, as Kibana's own user does.
      esUser: { username: 'kibana_system', password: 'changeme' },
    });
  });

  afterAll(async () => {
    pod?.stop();
    simulator?.server.close();
    await kibanaServer?.stop();
    await esServer?.stop();
  });

  it('serves the agent task type Kibana registered', async () => {
    const health = (await http(`${pod.url}/health`)).json() as { taskTypes: string[] };
    expect(taskManager.getRegisteredTypes()).toContain('agent-builder:run-agent');
    expect(health.taskTypes).toContain('agent-builder:run-agent');
  });

  it('runs an agent in the pod, not in Kibana', async () => {
    // Kibana's own task handler, to see that it is never used for this run.
    const plugin = agentBuilderStartSpy.mock.contexts[0] as {
      serviceManager: { internalStart: { taskHandler: { run: (...args: unknown[]) => unknown } } };
    };
    const kibanaRun = jest.spyOn(plugin.serviceManager.internalStart.taskHandler, 'run');

    const response = await http(
      `http://localhost:${KIBANA_PORT}/api/agent_builder/converse/async`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'kbn-xsrf': 'x', authorization: auth },
        body: JSON.stringify({
          input: 'hello',
          connector_id: 'parity-llm',
          execution_id: randomUUID(),
        }),
      }
    );
    const text = response.text();
    expect(response.status).toBe(200);
    expect(text).toContain(REPLY);
    expect(simulator.requests.length).toBeGreaterThan(0);
    expect(kibanaRun).not.toHaveBeenCalled();
  });

  it('reads the settings stored in Kibana: the default connector', async () => {
    // Only the stored setting says which model to use, so the pod has to read it.
    const settings = await http(`http://localhost:${KIBANA_PORT}/internal/kibana/settings`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'x',
        'x-elastic-internal-origin': 'kibana',
        authorization: auth,
      },
      body: JSON.stringify({ changes: { 'genAiSettings:defaultAIConnector': 'parity-llm' } }),
    });
    expect(settings.status).toBe(200);

    const before = simulator.requests.length;
    const response = await http(
      `http://localhost:${KIBANA_PORT}/api/agent_builder/converse/async`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'kbn-xsrf': 'x', authorization: auth },
        body: JSON.stringify({ input: 'hello again', execution_id: randomUUID() }),
      }
    );
    expect(response.status).toBe(200);
    expect(response.text()).toContain(REPLY);
    expect(simulator.requests.length).toBeGreaterThan(before);
  });

  it('did not create any index or data stream', async () => {
    const created = (await listIndices(kibanaServer)).filter((i) => !indicesBeforePod.includes(i));
    const notThePods = (i: string) =>
      i.startsWith('.ds-') ||
      i.startsWith('.security-profile') ||
      i.startsWith('.ai-index') ||
      i.startsWith('.chat-') ||
      i.startsWith('.agent') ||
      i.startsWith('.conversations');
    expect(created.filter((i) => !notThePods(i))).toEqual([]);
  });
});
