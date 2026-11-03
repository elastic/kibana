/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A test helper writing a temp config file for the pod process.
// eslint-disable-next-line @kbn/eslint/require_kbn_fs
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { createServer, request } from 'http';
import type { AddressInfo } from 'net';
import { REPO_ROOT } from '@kbn/repo-info';
import { esTestConfig } from '@kbn/test';
import type { TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { retry } from './retry';

export const ENCRYPTION_KEY = 'a'.repeat(32);

/** A small JSON client; the pod and Kibana are reached over localhost. */
export const http = (
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {}
) =>
  new Promise<{ status: number; json: () => unknown; text: () => string }>((resolve, reject) => {
    const req = request(url, { method: init.method ?? 'GET', headers: init.headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, json: () => JSON.parse(data), text: () => data })
      );
    });
    req.on('error', reject);
    req.end(init.body);
  });

export const listIndices = async (kibanaServer: TestKibanaUtils) => {
  const es = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  const indices = await es.cat.indices({ format: 'json', h: 'index', expand_wildcards: 'all' });
  const dataStreams = await es.indices.getDataStream({ name: '*', expand_wildcards: 'all' });
  return [
    ...indices.map((i) => i.index as string),
    ...dataStreams.data_streams.map((d) => d.name),
  ].sort();
};

/** Other plugins install their indices lazily after start; waits until the list is stable. */
export const waitForStableIndices = async (kibanaServer: TestKibanaUtils) => {
  let stable: string[] = [];
  let previous = '';
  await retry(
    async () => {
      stable = await listIndices(kibanaServer);
      const current = stable.join();
      const same = current === previous;
      previous = current;
      expect(same).toBe(true);
    },
    { times: 60, intervalMs: 3000 }
  );
  return stable;
};

export interface PodProcess {
  url: string;
  stop: () => void;
}

/**
 * Starts `scripts/task_pod.js` for a family against the test ES, with `podConfig` as the pod's
 * `POD_CONFIG` (kibana.yml keys). A separate process, as in production: in Kibana's process the pod
 * would share Kibana's bridges.
 */
export const startPodProcess = async ({
  family,
  port,
  podConfig = {},
  esUser = { username: 'elastic', password: 'changeme' },
}: {
  family: string;
  port: number;
  podConfig?: Record<string, unknown>;
  /** The Elasticsearch user of the pod: `kibana_system` writes to restricted system indices. */
  esUser?: { username: string; password: string };
}): Promise<PodProcess> => {
  const url = `http://localhost:${port}`;
  const dir = mkdtempSync(join(tmpdir(), 'task-pod-'));
  const configPath = join(dir, 'pod.yml');
  writeFileSync(
    configPath,
    JSON.stringify({
      'xpack.encryptedSavedObjects.encryptionKey': ENCRYPTION_KEY,
      ...podConfig,
    })
  );
  const { hostname, port: esPort } = new URL(esTestConfig.getUrl());
  // TASK_POD_BIN points at a built distribution's `bin/kibana-task-pod`, to run the same checks
  // against the distributable (transpiled, unbundled) instead of the source tree.
  const builtBin = process.env.TASK_POD_BIN;
  const [command, args] = builtBin
    ? [builtBin, ['--family', family]]
    : [process.execPath, ['scripts/task_pod.js', '--family', family]];
  const pod: ChildProcess = spawn(command, args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ES_URL: `http://${hostname}:${esPort}`,
      ES_USERNAME: esUser.username,
      ES_PASSWORD: esUser.password,
      POD_CONFIG: configPath,
      PORT: String(port),
    },
    stdio: ['ignore', 'inherit', 'inherit'],
    // The launcher re-executes itself; a group lets us stop both processes.
    detached: true,
  });
  const startedAt = Date.now();
  await retry(
    async () => {
      expect((await http(`${url}/health`)).status).toBe(200);
    },
    { times: 240, intervalMs: 500 }
  );
  if (process.env.TASK_POD_METRICS) {
    // Startup is spawn to the first healthy answer (500 ms polling); memory is the resident set of
    // the process listening on the port after it has been idle for a few seconds.
    const startupMs = Date.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const { execSync } = await import('child_process');
    let rssMb = -1;
    try {
      const pid = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`).toString().trim().split('\n')[0];
      rssMb = Math.round(Number(execSync(`ps -o rss= -p ${pid}`).toString().trim()) / 1024);
    } catch (e) {
      // leave -1
    }
    // eslint-disable-next-line no-console
    console.log(
      `POD_METRICS mode=${
        builtBin ? 'built' : 'dev'
      } family=${family} startupMs=${startupMs} idleRssMb=${rssMb}`
    );
  }
  return {
    url,
    stop: () => {
      if (pod.pid) process.kill(-pod.pid, 'SIGTERM');
    },
  };
};

export const MODEL_REPLY = 'Hello from the simulator';

/** An OpenAI chat completions endpoint that answers every request with `MODEL_REPLY`. */
export const startModelSimulator = async () => {
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
        res.write(chunk({ role: 'assistant', content: MODEL_REPLY }, null));
        res.write(chunk({}, 'stop', { usage }));
        res.end('data: [DONE]\n\n');
      } else {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            ...base,
            object: 'chat.completion',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: MODEL_REPLY },
                finish_reason: 'stop',
              },
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
