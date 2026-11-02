#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Summarize an esbuild metafile: total input bytes, module count, bytes per owning package,
 * and every Kibana plugin / Core input.
 *
 * Usage: node analyze_meta.mjs <meta.json> [--top N] [--json out.json]
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';

const [metaPath, ...rest] = process.argv.slice(2);
const top = Number(rest[rest.indexOf('--top') + 1] || 25);
const jsonOut = rest.includes('--json') ? rest[rest.indexOf('--json') + 1] : undefined;

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const cwd = process.cwd();
const repoRoot = resolve(new URL('../../../../../../..', import.meta.url).pathname);

const ownerCache = new Map();
const findOwner = (absFile) => {
  let dir = dirname(absFile);
  const visited = [];
  while (dir.startsWith(repoRoot) && dir !== repoRoot) {
    if (ownerCache.has(dir)) {
      const owner = ownerCache.get(dir);
      visited.forEach((d) => ownerCache.set(d, owner));
      return owner;
    }
    visited.push(dir);
    const jsonc = join(dir, 'kibana.jsonc');
    if (existsSync(jsonc)) {
      const text = readFileSync(jsonc, 'utf8');
      const id = /"id"\s*:\s*"([^"]+)"/.exec(text)?.[1];
      const type = /"type"\s*:\s*"([^"]+)"/.exec(text)?.[1];
      const owner = { name: id ?? relative(repoRoot, dir), kind: type === 'plugin' ? 'kbn-plugin' : 'kbn' };
      visited.forEach((d) => ownerCache.set(d, owner));
      return owner;
    }
    const pkg = join(dir, 'package.json');
    if (dir.includes('/node_modules/') && existsSync(pkg)) {
      const { name } = JSON.parse(readFileSync(pkg, 'utf8'));
      if (name) {
        // Nested package.json files inside a package (e.g. `lib/package.json` with only `type`)
        // have no name; keep walking for those.
        const nm = dir.lastIndexOf('/node_modules/');
        const top = dir.slice(nm + '/node_modules/'.length).split('/');
        const topName = top[0].startsWith('@') ? `${top[0]}/${top[1]}` : top[0];
        const owner = { name: topName, kind: 'npm' };
        visited.forEach((d) => ownerCache.set(d, owner));
        return owner;
      }
    }
    dir = dirname(dir);
  }
  const owner = { name: '(unknown)', kind: 'unknown' };
  visited.forEach((d) => ownerCache.set(d, owner));
  return owner;
};

const byPackage = new Map();
const kbnCoupling = [];
let totalBytes = 0;
let count = 0;

for (const [input, { bytes }] of Object.entries(meta.inputs)) {
  count++;
  totalBytes += bytes;
  const abs = resolve(cwd, input);
  const owner = findOwner(abs);
  const entry = byPackage.get(owner.name) ?? { name: owner.name, kind: owner.kind, bytes: 0, files: 0 };
  entry.bytes += bytes;
  entry.files++;
  byPackage.set(owner.name, entry);
}

const sorted = [...byPackage.values()].sort((a, b) => b.bytes - a.bytes);
for (const p of sorted) {
  if (/^@kbn\/(core|.*-plugin$)/.test(p.name) || p.kind === 'kbn-plugin') kbnCoupling.push(p);
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
const kb = (b) => `${(b / 1024).toFixed(0)} KB`;

console.log(`inputs: ${count} files, ${mb(totalBytes)}`);
for (const [out, { bytes }] of Object.entries(meta.outputs ?? {})) {
  if (!out.endsWith('.map')) console.log(`output: ${out} ${mb(bytes)}`);
}
console.log(`packages: ${sorted.length}`);
console.log(`\n| Package | Kind | Files | Bytes |\n| --- | --- | --- | --- |`);
for (const p of sorted.slice(0, top)) console.log(`| ${p.name} | ${p.kind} | ${p.files} | ${kb(p.bytes)} |`);
console.log(`\nKibana plugin / Core packages in graph (${kbnCoupling.length}):`);
console.log(`\n| Package | Kind | Files | Bytes |\n| --- | --- | --- | --- |`);
for (const p of kbnCoupling) console.log(`| ${p.name} | ${p.kind} | ${p.files} | ${kb(p.bytes)} |`);

if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ count, totalBytes, packages: sorted }, null, 2));

// --why <pkgA,pkgB>: shortest import chain from the entry point to the first file of each package,
// printed at package granularity with the import statement that crosses each package boundary.
if (rest.includes('--why')) {
  const targets = rest[rest.indexOf('--why') + 1].split(',');
  const entry = Object.values(meta.outputs).find((o) => o.entryPoint)?.entryPoint;
  const ownerOf = (input) => findOwner(resolve(cwd, input)).name;
  const prev = new Map([[entry, null]]);
  const queue = [entry];
  while (queue.length) {
    const cur = queue.shift();
    for (const imp of meta.inputs[cur]?.imports ?? []) {
      if (imp.external || prev.has(imp.path)) continue;
      prev.set(imp.path, { from: cur, original: imp.original });
      queue.push(imp.path);
    }
  }
  for (const target of targets) {
    const hit = [...prev.keys()].find((input) => ownerOf(input) === target);
    if (!hit) {
      console.log(`\nwhy ${target}: not in graph`);
      continue;
    }
    const chain = [];
    for (let cur = hit; cur; cur = prev.get(cur)?.from) chain.unshift({ file: cur, via: prev.get(cur)?.original });
    console.log(`\nwhy ${target}:`);
    let lastOwner;
    for (const { file, via } of chain) {
      const owner = ownerOf(file);
      const short = relative(repoRoot, resolve(cwd, file));
      if (owner !== lastOwner) console.log(`  [${owner}] ${short}${via ? `   (import '${via}')` : ''}`);
      else console.log(`      ${short}${via ? `   (import '${via}')` : ''}`);
      lastOwner = owner;
    }
  }
}
