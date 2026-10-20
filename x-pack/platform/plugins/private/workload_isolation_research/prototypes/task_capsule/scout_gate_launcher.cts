/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const { createRequire } = require('node:module') as typeof import('node:module');
const { join } = require('node:path') as typeof import('node:path');
const { spawn, execFileSync } = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises') as typeof import('node:timers/promises');
const root = process.cwd();
assert.equal(root, '/Users/jloleysens/repos/work/kibana-t1-isolated-tasks');
const evidence = process.env.WIR_EVIDENCE_DIR;
assert.ok(evidence);
fs.mkdirSync(evidence, { recursive: true });
const dependencies = createRequire(join(root, 'package.json'));
dependencies('@kbn/setup-node-env');
const { kibanaDevServiceAccount } = dependencies('@kbn/dev-utils') as typeof import('@kbn/dev-utils');
const { MOCK_IDP_UIAM_SHARED_SECRET } = dependencies('@kbn/mock-idp-utils') as typeof import('@kbn/mock-idp-utils');
const password = 'changeme';
const secrets = [password, kibanaDevServiceAccount.token, MOCK_IDP_UIAM_SHARED_SECRET];
const sanitize = (line: string): string => secrets.reduce((value, secret) => value.replaceAll(secret, '[REDACTED]'), line)
  .replace(/((?:password|sharedSecret|serviceAccountToken|encryptionKey)=["']?)[^\s"']+/gi, '$1[REDACTED]')
  .replace(/(https?:\/\/)[^@/\s]+@/g, '$1[REDACTED]@');
const log = fs.openSync(join(evidence, 'scout_gate.log'), 'w', 0o600);
const before = new Set(execFileSync('docker', ['ps', '-aq'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean));
const owned = new Set<string>();
const projects = new Set<string>();
const identify = (): void => {
  const ids = execFileSync('docker', ['ps', '-aq'], { encoding: 'utf8' }).trim().split('\n').filter((id) => id && !before.has(id));
  if (!ids.length) return;
  const containers = JSON.parse(execFileSync('docker', ['inspect', ...ids], { encoding: 'utf8' })) as Array<{ Id: string; Name: string; Mounts: Array<{ Source: string }>; Config: { Labels: Record<string, string> | null } }>;
  for (const container of containers) {
    if (container.Mounts.some((mount) => mount.Source.startsWith(root + '/'))) {
      owned.add(container.Id);
      const project = container.Config.Labels?.['com.docker.compose.project'];
      if (project) projects.add(project);
    }
  }
  for (const container of containers) {
    const project = container.Config.Labels?.['com.docker.compose.project'];
    if (project && projects.has(project)) owned.add(container.Id);
  }
};
const child = spawn(process.execPath, ['scripts/scout', 'start-server', '--arch', 'serverless', '--domain', 'observability_complete'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
assert.ok(child.pid);
let pending = '';
let logClosed = false;
const consume = (chunk: Buffer): void => {
  if (logClosed) return;
  pending += chunk.toString('utf8');
  const lines = pending.split('\n'); pending = lines.pop() ?? '';
  for (const line of lines) fs.writeSync(log, sanitize(line) + '\n');
};
child.stdout?.on('data', consume);
child.stderr?.on('data', consume);
const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
const checkpoint = (status: string): void => fs.writeFileSync(join(evidence, 'scout_gate_resources.json'), JSON.stringify({ status, owner_pid: process.pid, scout_group: child.pid, cwd: root, ports: [5620, 9220], owned_containers: [...owned], utc: new Date().toISOString() }, null, 2));
const authorization = `Basic ${Buffer.from(`elastic_serverless:${password}`).toString('base64')}`;
const api = async (endpoint: string, body?: object): Promise<Record<string, unknown>> => {
  const response = await fetch(`http://localhost:5620${endpoint}`, { method: body ? 'POST' : 'GET', headers: { authorization, 'kbn-xsrf': 'research', 'x-elastic-internal-origin': 'kibana', 'elastic-api-version': '1', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, `${endpoint} HTTP status`);
  return await response.json() as Record<string, unknown>;
};
const base = '/internal/workload_isolation_research';
const runId = 't1-serverless-scout-gate-001';
const main = async (): Promise<void> => {
  checkpoint('starting');
  try {
    const deadline = Date.now() + 45 * 60 * 1000;
    let available = false;
    while (Date.now() < deadline) {
      controller.signal.throwIfAborted();
      identify(); checkpoint('waiting_for_scout');
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Scout exited before availability; inspect sanitized log');
      try {
        const status = await api('/api/status');
        available = (status.status as { overall?: { level?: string } })?.overall?.level === 'available';
      } catch { available = false; }
      if (available) break;
      await delay(5000, undefined, { signal: controller.signal });
    }
    assert.ok(available, 'Scout availability deadline');
    const beforeInfo = await api(`${base}/info`);
    const sampleFor = async (taskId: string): Promise<Record<string, unknown>> => {
      const until = Date.now() + 120000;
      while (Date.now() < until) {
        controller.signal.throwIfAborted();
        const page = await api(`${base}/samples_es`, { from: Date.now() - 180000, to: Date.now() + 1000, size: 10000 });
        const item = (page.hits as Array<Record<string, unknown>>).find((row) => row.task_id === taskId && row.run_id === runId && ['offender', 'offender_terminal'].includes(String(row.source)));
        if (item) return item;
        await delay(500);
      }
      throw new Error('No pushed terminal task evidence');
    };
    const finite = await api(`${base}/offender`, { runId, mode: 'task', execution: 'thread', kind: 'cpu_spin', doseMs: 1000, killAfterMs: 20000 });
    const success = await sampleFor(String(finite.task_id));
    assert.equal(success.outcome, 'success'); assert.ok(Number(success.worker_thread_id) > 0);
    const runaway = await api(`${base}/offender`, { runId, mode: 'task', execution: 'thread', kind: 'infinite_loop', doseMs: 10000, killAfterMs: 1000 });
    const terminated = await sampleFor(String(runaway.task_id));
    assert.equal(terminated.outcome, 'terminated'); assert.equal(terminated.discarded_runs, 1); assert.equal(terminated.collateral, false);
    const recovery = await api(`${base}/offender`, { runId, mode: 'task', execution: 'thread', kind: 'cpu_spin', doseMs: 20 });
    const recovered = await sampleFor(String(recovery.task_id)); assert.equal(recovered.outcome, 'success');
    assert.equal(success.boot_id, terminated.boot_id); assert.equal(success.boot_id, recovered.boot_id);
    const afterInfo = await api(`${base}/info`); assert.equal(beforeInfo.boot_id, afterInfo.boot_id);
    const expected = { [String(finite.task_id)]: 'success', [String(runaway.task_id)]: 'failed', [String(recovery.task_id)]: 'success' };
    let outcomes: Record<string, string> = {};
    const outcomeDeadline = Date.now() + 30000;
    while (Date.now() < outcomeDeadline) {
      const result = await api(`${base}/tasks/_outcome`, { ids: Object.keys(expected) });
      outcomes = result.outcomes as Record<string, string>;
      if (Object.entries(expected).every(([id, outcome]) => outcomes[id] === outcome)) break;
      await delay(500);
    }
    assert.deepEqual(outcomes, expected);
    const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    fs.writeFileSync(join(evidence, 'scout_gate_proof.json'), JSON.stringify({ run_id: runId, source_commit: sourceCommit, task_outcomes: outcomes, available: true, command: 'node scripts/scout start-server --arch serverless --domain observability_complete', before: beforeInfo, after: afterInfo, finite: success, terminated, recovery: recovered, correctness_only: true }, null, 2));
    checkpoint('smoke_passed');
  } finally {
    const alive = (): boolean => { try { process.kill(-Number(child.pid), 0); return true; } catch { return false; } };
    if (alive()) process.kill(-Number(child.pid), 'SIGTERM');
    for (let i = 0; i < 200 && alive(); i++) await delay(100);
    if (alive()) process.kill(-Number(child.pid), 'SIGKILL');
    for (let i = 0; i < 30 && alive(); i++) await delay(100);
    identify();
    const present = new Set(execFileSync('docker', ['ps', '-aq'], { encoding: 'utf8' }).trim().split('\n'));
    const remaining = [...owned].filter((id) => present.has(id) || [...present].some((shortId) => id.startsWith(shortId)));
    if (remaining.length) { execFileSync('docker', ['stop', '--time', '10', ...remaining], { stdio: 'ignore' }); execFileSync('docker', ['rm', ...remaining], { stdio: 'ignore' }); }
    if (pending) fs.writeSync(log, sanitize(pending));
    logClosed = true;
    fs.closeSync(log);
    checkpoint(alive() ? 'cleanup_failed' : 'stopped');
  }
};
void main().catch((error: Error) => { process.stderr.write(sanitize(error.message) + '\n'); process.exitCode = 1; });
