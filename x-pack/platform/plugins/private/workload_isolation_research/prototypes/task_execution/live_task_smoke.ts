/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import {
  openSync,
  closeSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

interface Sample {
  source: string;
  task_id?: string;
  outcome?: string;
  execution?: string;
  worker_thread_id?: number;
  discarded_runs?: number;
  collateral?: boolean;
}
interface Info {
  pid: number;
  boot_id: string;
  isolated_pools: Array<{ workloadClass: string; active: number; threads: number }>;
}
interface Resource {
  role: string;
  pid: number;
  cwd: string;
  ports: number[];
  stopped?: boolean;
}

const root = process.cwd();
assert.equal(root, '/Users/jloleysens/repos/work/kibana-t1-isolated-tasks');
const kibanaPort = Number(process.env.WIR_KIBANA_PORT ?? 5621);
const esPort = Number(process.env.WIR_ES_PORT ?? 9221);
const transportPort = Number(process.env.WIR_ES_TRANSPORT_PORT ?? 9321);
const headless = process.env.WIR_HEADLESS === '1';
const localPassword = randomBytes(32).toString('hex');
const authorization = `Basic ${Buffer.from(`elastic:${localPassword}`).toString('base64')}`;
const evidence = process.env.WIR_EVIDENCE_DIR;
assert.ok(evidence, 'Set WIR_EVIDENCE_DIR to the task-owned evidence directory');
mkdirSync(evidence, { recursive: true });
const resourcePath = join(evidence, 'phase_b_live_resources.json');
const resources: Resource[] = [];
const children: ChildProcess[] = [];
const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
const checkpoint = (status: string): void => {
  const data = JSON.stringify(
    { run_id: runId, status, utc: new Date().toISOString(), resources },
    null,
    2
  );
  writeFileSync(resourcePath, data, { mode: 0o600 });
  writeFileSync(join(evidence, `${runId}_resources.json`), data, { mode: 0o600 });
};
const groupAlive = (pid: number): boolean => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
};
const start = (role: string, args: string[], ports: number[]): void => {
  const fd = openSync(join(evidence, `${runId}_${role}.log`), 'w', 0o600);
  const child = spawn(process.execPath, args, {
    cwd: root,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: {
      ...process.env,
      ES_JAVA_OPTS: '-Xms512m -Xmx512m',
      WIR_ES_PORT: String(esPort),
      WIR_ES_TRANSPORT_PORT: String(transportPort),
      WIR_LOCAL_ES_PASSWORD: localPassword,
      KBN_RESEARCH_HEADLESS_BOOT: headless ? '1' : '0',
    },
  });
  closeSync(fd);
  assert.ok(child.pid, `${role} did not spawn`);
  children.push(child);
  resources.push({ role, pid: child.pid, cwd: root, ports });
  checkpoint('running_owned_foreground_stack');
};
const waitUntil = async (
  condition: () => Promise<boolean>,
  ms: number,
  label: string
): Promise<void> => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    controller.signal.throwIfAborted();
    if (children.some((child) => child.exitCode !== null || child.signalCode !== null)) {
      throw new Error(
        `Owned service exited while waiting for ${label}; inspect private service logs`
      );
    }
    if (await condition()) return;
    await delay(100);
  }
  throw new Error(`Deadline waiting for ${label}`);
};
const assertPortFree = (port: number): Promise<void> =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () =>
      server.close((error) => (error ? reject(error) : resolvePort()))
    );
  });
const api = async <T>(path: string, body?: object): Promise<T> => {
  const response = await fetch(
    `http://127.0.0.1:${kibanaPort}/internal/workload_isolation_research/${path}`,
    {
      method: body ? 'POST' : 'GET',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'research',
        'x-elastic-internal-origin': 'Kibana',
        authorization,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    }
  );
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return (await response.json()) as T;
};
const terminal = async (taskId: string): Promise<Sample> => {
  let found: Sample | undefined;
  await waitUntil(
    async () => {
      const data = await api<{ main: { samples: Array<{ item: Sample }> } }>('samples', {
        cursors: {},
        limit: 20000,
      });
      found = data.main.samples
        .map(({ item }) => item)
        .find(
          (item) =>
            item.task_id === taskId &&
            (item.source === 'offender' || item.source === 'offender_terminal')
        );
      return found !== undefined;
    },
    30000,
    `positive terminal evidence for ${taskId}`
  );
  assert.ok(found);
  return found;
};
const runId = process.env.WIR_RUN_ID ?? 'unregistered';
assert.match(runId, /^t1-phase-b-live-\d{3}$/);
const configPath = join(evidence, `${runId}_runtime_config.json`);
checkpoint('starting');
try {
  await Promise.all([kibanaPort, esPort, transportPort].map(assertPortFree));
  start(
    'es',
    [
      resolve(
        'x-pack/platform/plugins/private/workload_isolation_research/prototypes/task_capsule/live_es_launcher.cts'
      ),
    ],
    [esPort, transportPort]
  );
  await waitUntil(
    async () => {
      try {
        return (
          await fetch(`http://127.0.0.1:${esPort}/_cluster/health`, {
            headers: { authorization },
            signal: AbortSignal.timeout(1000),
          })
        ).ok;
      } catch {
        return false;
      }
    },
    150000,
    'local ES'
  );
  writeFileSync(
    configPath,
    JSON.stringify({
      elasticsearch: {
        hosts: [`http://127.0.0.1:${esPort}`],
        username: 'kibana_system',
        password: localPassword,
      },
      xpack: {
        security: { encryptionKey: randomBytes(32).toString('hex') },
        encryptedSavedObjects: { encryptionKey: randomBytes(32).toString('hex') },
        reporting: { encryptionKey: randomBytes(32).toString('hex') },
      },
    }),
    { mode: 0o600 }
  );
  start(
    'kibana',
    [
      'scripts/kibana',
      '--no-watch',
      '--no-optimizer',
      '--no-base-path',
      `--server.port=${kibanaPort}`,
      '--server.host=127.0.0.1',
      ...(headless
        ? [
            '--server.autoListen=false',
            '--node.roles=["ui"]',
            `--path.data=${join(root, 'data', runId)}`,
          ]
        : []),
      '--config',
      configPath,
      '--xpack.workload_isolation_research.pushToEs=false',
    ],
    [kibanaPort]
  );
  if (!headless)
    await waitUntil(
      async () => {
        try {
          return (
            await fetch(`http://127.0.0.1:${kibanaPort}/api/status`, {
              headers: { authorization },
              signal: AbortSignal.timeout(1000),
            })
          ).ok;
        } catch {
          return false;
        }
      },
      90000,
      'local Kibana'
    );
  if (headless) {
    const kibanaLog = join(evidence, `${runId}_kibana.log`);
    await waitUntil(
      async () => readFileSync(kibanaLog, 'utf8').includes('Kibana is now available'),
      90000,
      'headless plugin lifecycle'
    );
    await assertPortFree(kibanaPort);
    const log = readFileSync(kibanaLog, 'utf8');
    const marker = log.split('\n').find((line) => line.includes('research_headless '));
    assert.ok(marker, 'Missing positive research headless startup marker');
    const snapshot = JSON.parse(
      marker.slice(marker.indexOf('research_headless ') + 'research_headless '.length)
    ) as {
      node_roles: { backgroundTasks: boolean };
      rss: number;
      heap_used: number;
      registry_types: number;
    };
    assert.equal(snapshot.node_roles.backgroundTasks, false);
    const taskPollerStarts = (log.match(/Starting the task poller/g) ?? []).length;
    assert.equal(taskPollerStarts, 0);
    // Explicit visibility fence and hidden-index expansion: immediate count=0 is not absence of writes.
    const refresh = await fetch(
      `http://127.0.0.1:${esPort}/.kibana*/_refresh?ignore_unavailable=true&expand_wildcards=all`,
      { method: 'POST', headers: { authorization } }
    );
    assert.equal(refresh.status, 200);
    const count = async (pattern: string): Promise<number> => {
      const response = await fetch(
        `http://127.0.0.1:${esPort}/${pattern}/_count?ignore_unavailable=true&expand_wildcards=all`,
        { headers: { authorization } }
      );
      assert.equal(response.status, 200);
      return ((await response.json()) as { count: number }).count;
    };
    console.log(
      JSON.stringify({
        run_id: runId,
        correctness_only: true,
        headless_boot: true,
        http_listener_absent: true,
        task_poller_starts: taskPollerStarts,
        snapshot,
        saved_object_documents_after_boot: await count('.kibana*'),
        task_documents_after_boot: await count('.kibana_task_manager*'),
        monitoring_start_lines: (log.match(/Starting monitoring stats collection/g) ?? []).length,
        completed_migration_logs: (log.match(/Completed all migrations/g) ?? []).length,
        startup_scheduling_logs: (log.match(/scheduled/g) ?? []).length,
        limits:
          'full_default_plugin_graph_not_minimal_island; no_task_dispatch_or_telemetry_delivery_proof_no_scores',
      })
    );
  } else {
    const before = await api<Info>('info');
    const finite = await api<{ task_id: string }>('offender', {
      mode: 'task',
      execution: 'thread',
      kind: 'cpu_spin',
      doseMs: 1000,
      killAfterMs: 10000,
      runId,
    });
    await waitUntil(
      async () => (await api<Info>('info')).isolated_pools.some(({ active }) => active > 0),
      30000,
      'active isolated TM task'
    );
    const activeInfo = await api<Info>('info');
    assert.equal(activeInfo.boot_id, before.boot_id);
    const finiteResult = await terminal(finite.task_id);
    assert.equal(finiteResult.outcome, 'success');
    assert.equal(finiteResult.execution, 'thread');
    assert.ok((finiteResult.worker_thread_id ?? 0) > 0);
    const runaway = await api<{ task_id: string }>('offender', {
      mode: 'task',
      execution: 'thread',
      kind: 'infinite_loop',
      doseMs: 60000,
      killAfterMs: 1000,
      runId,
    });
    const killed = await terminal(runaway.task_id);
    assert.equal(killed.outcome, 'terminated');
    assert.equal(killed.collateral, false);
    assert.equal(killed.discarded_runs, 1);
    const afterKill = await api<Info>('info');
    assert.equal(afterKill.pid, before.pid);
    assert.equal(afterKill.boot_id, before.boot_id);
    const recovery = await api<{ task_id: string }>('offender', {
      mode: 'task',
      execution: 'thread',
      kind: 'cpu_spin',
      doseMs: 20,
      runId,
    });
    const recovered = await terminal(recovery.task_id);
    assert.equal(recovered.outcome, 'success');
    console.log(
      JSON.stringify({
        run_id: runId,
        correctness_only: true,
        main_pid_unchanged: true,
        control_api_during_active_task: true,
        finite: finiteResult,
        runaway: killed,
        recovery: recovered,
        limits: 'local_superuser_correctness_only; no_scores_no_adoption_no_QAF',
      })
    );
  }
} finally {
  checkpoint('stopping');
  await Promise.all(
    resources.map(async (resource) => {
      if (groupAlive(resource.pid)) process.kill(-resource.pid, 'SIGTERM');
      for (let i = 0; i < 100 && groupAlive(resource.pid); i++) await delay(100);
      if (groupAlive(resource.pid)) process.kill(-resource.pid, 'SIGKILL');
      for (let i = 0; i < 30 && groupAlive(resource.pid); i++) await delay(100);
      resource.stopped = !groupAlive(resource.pid);
    })
  );
  if (existsSync(configPath)) unlinkSync(configPath);
  checkpoint(resources.every(({ stopped }) => stopped) ? 'stopped' : 'cleanup_failed');
}
