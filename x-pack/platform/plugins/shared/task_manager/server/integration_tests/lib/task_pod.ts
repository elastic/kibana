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
import { request } from 'http';
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
  const pod: ChildProcess = spawn(process.execPath, ['scripts/task_pod.js', '--family', family], {
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
  await retry(
    async () => {
      expect((await http(`${url}/health`)).status).toBe(200);
    },
    { times: 240, intervalMs: 500 }
  );
  return {
    url,
    stop: () => {
      if (pod.pid) process.kill(-pod.pid, 'SIGTERM');
    },
  };
};
