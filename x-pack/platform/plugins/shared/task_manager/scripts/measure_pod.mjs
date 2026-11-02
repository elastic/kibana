#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Memory of a task pod (or any process, for comparison) with the same method everywhere.
 *
 *   node measure_pod.mjs --pod <built.sh|built.mjs> [--label name] [--env KEY=VAL ...]
 *   node measure_pod.mjs --pid <pid> [--label name]
 *
 * Prints a markdown table row: RSS and `footprint` (macOS; what the OS charges the process), plus
 * V8 heap use for pods. Pods start with ES_URL/ES_USERNAME/ES_PASSWORD from the environment.
 */

import { spawn, execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const getAll = (name) =>
  args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []));
const getArg = (name, fallback) => getAll(name)[0] ?? fallback;

const label = getArg('--label', getArg('--pod', `pid ${getArg('--pid', '?')}`));
const mb = (n) => Math.round(n / 1e6);

const rssOf = (pid) => {
  // The whole process tree: a launcher script or a Kibana parent has children.
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=']).toString().trim().split('\n');
  const procs = rows.map((r) => r.trim().split(/\s+/).map(Number));
  const tree = new Set([pid]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [p, pp] of procs) {
      if (tree.has(pp) && !tree.has(p)) {
        tree.add(p);
        grew = true;
      }
    }
  }
  return procs.filter(([p]) => tree.has(p)).reduce((sum, [, , kb]) => sum + kb * 1024, 0);
};

const footprintOf = (pid) => {
  try {
    const out = execFileSync('footprint', ['-p', String(pid)], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString();
    const m = out.match(/Footprint: ([\d.]+) (KB|MB|GB)/);
    return m ? Number(m[1]) * { KB: 1e3, MB: 1e6, GB: 1e9 }[m[2]] : undefined;
  } catch {
    return undefined;
  }
};

const row = (cells) => `| ${cells.join(' | ')} |`;

if (getArg('--pid')) {
  const pid = Number(getArg('--pid'));
  console.log(row([label, mb(rssOf(pid)), footprintOf(pid) ? mb(footprintOf(pid)) : '-', '-']));
  process.exit(0);
}

const target = getArg('--pod');
if (!target) {
  console.error('usage: measure_pod.mjs --pod <built.sh|built.mjs> | --pid <pid> [--label name]');
  process.exit(1);
}
const env = { ...process.env, PORT: getArg('--port', '4175') };
for (const pair of getAll('--env')) {
  const [k, ...v] = pair.split('=');
  env[k] = v.join('=');
}
const [cmd, cmdArgs] = target.endsWith('.sh') ? [target, []] : ['node', [target]];
const child = spawn(cmd, cmdArgs, { env, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (d) => (stderr += d));
await new Promise((resolve, reject) => {
  child.stdout.on('data', (d) => d.toString().includes('READY') && resolve());
  child.on('exit', (code) => reject(new Error(`pod exited ${code}: ${stderr.slice(-400)}`)));
  setTimeout(() => reject(new Error('pod not ready in 60s')), 60000);
});
await new Promise((r) => setTimeout(r, 3000)); // let the boot settle
const health = await (await fetch(`http://localhost:${env.PORT}/health`)).json();
// `rss` in /health is the pod's own; the process tree adds a launcher shell, which `exec`s away.
const pid = child.pid;
console.log(
  row([
    label,
    mb(rssOf(pid)),
    footprintOf(pid) ? mb(footprintOf(pid)) : '-',
    health.taskTypes?.length ?? '-',
  ])
);
child.kill('SIGTERM');
