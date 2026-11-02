#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC measurement harness.
 *
 * Usage:
 *   node measure.mjs [options] -- <command> [args...]
 *
 * Options:
 *   --label <name>          Row label (default: the command line)
 *   --runs <n>              Cold runs, median reported (default: 3)
 *   --ready <regex>         Line pattern that marks READY (default: ^READY\b)
 *   --done <regex>          Optional line pattern sampled as "after run" (e.g. ^RESULT\b)
 *   --idle-ms <ms>          Delay after READY (or DONE) before the idle sample (default: 5000)
 *   --timeout-ms <ms>       Give up on a run after this long (default: 600000)
 *   --modules               Preload a hook that prints `MODULES <n>` (require.cache size) on READY
 *   --bundle <path>         Report the size of this file in the bundle column
 *   --verbose               Echo child output
 *
 * RSS is the sum over the spawned process and all its descendants, read with `ps`.
 */

import { spawn, execFileSync } from 'node:child_process';
import { statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep === -1 || sep === argv.length - 1) {
  console.error('usage: node measure.mjs [options] -- <command> [args...]');
  process.exit(2);
}
const opts = argv.slice(0, sep);
const [command, ...commandArgs] = argv.slice(sep + 1);

const getOpt = (name, fallback) => {
  const i = opts.indexOf(name);
  return i === -1 ? fallback : opts[i + 1];
};
const hasFlag = (name) => opts.includes(name);

const label = getOpt('--label', [command, ...commandArgs].join(' '));
const runs = Number(getOpt('--runs', '3'));
const readyRe = new RegExp(getOpt('--ready', '^READY\\b'));
const doneSource = getOpt('--done', undefined);
const doneRe = doneSource ? new RegExp(doneSource) : undefined;
const idleMs = Number(getOpt('--idle-ms', '5000'));
const timeoutMs = Number(getOpt('--timeout-ms', '600000'));
const printModules = hasFlag('--modules');
const bundlePath = getOpt('--bundle', undefined);
const verbose = hasFlag('--verbose');

const preloadPath = (() => {
  if (!printModules) return undefined;
  const dir = mkdtempSync(join(tmpdir(), 'poc-measure-'));
  const file = join(dir, 'modules_preload.cjs');
  writeFileSync(
    file,
    `
const origWrite = process.stdout.write.bind(process.stdout);
const readyRe = new RegExp(process.env.POC_MEASURE_READY_RE, 'm');
let reported = false;
process.stdout.write = (chunk, ...rest) => {
  const out = origWrite(chunk, ...rest);
  if (!reported && readyRe.test(String(chunk))) {
    reported = true;
    origWrite('MODULES ' + Object.keys(require.cache).length + '\\n');
  }
  return out;
};
`
  );
  return file;
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const treeRssKb = (rootPid) => {
  let out;
  try {
    out = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,rss='], { encoding: 'utf8' });
  } catch {
    return undefined;
  }
  const rows = out
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/).map(Number));
  const children = new Map();
  const rss = new Map();
  for (const [pid, ppid, kb] of rows) {
    rss.set(pid, kb);
    if (!children.has(ppid)) children.set(ppid, []);
    children.get(ppid).push(pid);
  }
  if (!rss.has(rootPid)) return undefined;
  let total = 0;
  const stack = [rootPid];
  while (stack.length) {
    const pid = stack.pop();
    total += rss.get(pid) ?? 0;
    stack.push(...(children.get(pid) ?? []));
  }
  return total;
};

const killTree = (rootPid) => {
  try {
    process.kill(-rootPid, 'SIGKILL');
  } catch {
    try {
      process.kill(rootPid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
};

const runOnce = () =>
  new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (preloadPath) {
      env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --require ${preloadPath}`.trim();
      env.POC_MEASURE_READY_RE = readyRe.source;
    }
    const start = process.hrtime.bigint();
    const child = spawn(command, commandArgs, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    const result = { readyMs: undefined, rssReadyKb: undefined, rssDoneKb: undefined };
    let buffer = '';
    let settled = false;
    let doneSeen = false;

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killTree(child.pid);
      if (err) reject(err);
      else resolve(result);
    };

    const timer = setTimeout(() => finish(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);

    const scheduleIdle = () => {
      sleep(idleMs).then(() => {
        result.rssIdleKb = treeRssKb(child.pid);
        finish();
      });
    };

    const onLine = (line) => {
      if (verbose) process.stderr.write(`  | ${line}\n`);
      if (result.readyMs === undefined && readyRe.test(line)) {
        result.readyMs = Number(process.hrtime.bigint() - start) / 1e6;
        result.rssReadyKb = treeRssKb(child.pid);
        if (!doneRe) scheduleIdle();
      }
      const modulesMatch = /^MODULES (\d+)/.exec(line);
      if (modulesMatch) result.modules = Number(modulesMatch[1]);
      if (doneRe && !doneSeen && result.readyMs !== undefined && doneRe.test(line)) {
        doneSeen = true;
        result.rssDoneKb = treeRssKb(child.pid);
        scheduleIdle();
      }
    };

    const onData = (chunk) => {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        onLine(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 1);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      if (!settled) finish(new Error(`child exited early with code ${code}`));
    });
  });

const median = (values) => {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (v.length === 0) return undefined;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

const fmtMb = (kb) => (kb === undefined ? '-' : `${(kb / 1024).toFixed(0)} MB`);
const fmtMs = (ms) => (ms === undefined ? '-' : `${ms.toFixed(0)} ms`);
const fmtBytes = (bytes) =>
  bytes === undefined ? '-' : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const results = [];
for (let i = 0; i < runs; i++) {
  const r = await runOnce();
  results.push(r);
  process.stderr.write(
    `run ${i + 1}/${runs}: ready=${fmtMs(r.readyMs)} rssReady=${fmtMb(r.rssReadyKb)} rssDone=${fmtMb(
      r.rssDoneKb
    )} rssIdle=${fmtMb(r.rssIdleKb)} modules=${r.modules ?? '-'}\n`
  );
  await sleep(500);
}

const bundleBytes = bundlePath ? statSync(bundlePath).size : undefined;
const row = {
  label,
  rssReady: fmtMb(median(results.map((r) => r.rssReadyKb))),
  rssDone: fmtMb(median(results.map((r) => r.rssDoneKb))),
  rssIdle: fmtMb(median(results.map((r) => r.rssIdleKb))),
  ready: fmtMs(median(results.map((r) => r.readyMs))),
  modules: median(results.map((r) => r.modules)) ?? '-',
  bundle: fmtBytes(bundleBytes),
};

console.log(
  `| ${row.label} | ${row.rssReady} | ${row.rssIdle} | ${row.rssDone} | ${row.ready} | ${row.modules} | ${row.bundle} |`
);
