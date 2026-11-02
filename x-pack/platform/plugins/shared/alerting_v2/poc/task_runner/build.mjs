#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Bundles a task pod.
 *
 *   node build.mjs --entry pod/main_alerting_v2.ts --out out/pod_alerting_v2.js [--minify]
 *   node build.mjs --all [--minify]   # builds every pod entry into out/
 *
 * Redirects are build-time ports: each one replaces a package entry that would otherwise drag in
 * Core or a plugin's own server entry (and everything that package re-exports) into the pod
 * bundle. Every redirect is a row in FINDINGS.md's coupling inventory.
 */

import { build } from 'esbuild';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import peggy from 'peggy';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '../..');
const args = process.argv.slice(2);
const getArg = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;

const minify = args.includes('--minify');
const all = args.includes('--all');

const port = (file) => join(here, 'ports', file);

/**
 * `@kbn/core/server`'s barrel drags in full Core boot even for two pure helpers.
 *
 * `@kbn/task-manager-plugin/server` has two redirects, most-specific first: `runInvalidate` (only
 * needed by Alerting v2's `invalidate_pending_api_keys` task) pulls `invalidate_api_keys_and_delete_so.ts`
 * -> `@kbn/core-http-server-utils` -> `@kbn/core-http-router-server-internal` -> `elastic-apm-node`
 * + `@grpc/grpc-js` + the OpenTelemetry SDK into *every* pod that imports anything at all from
 * `@kbn/task-manager-plugin/server` — including pods, like Notification Center's, that only read a
 * `TaskCost` enum and never call `runInvalidate`. Scoping the wider port to Alerting v2's own
 * importer keeps that ~70 MB off every other pod. Measured: Notification Center's pod dropped from
 * 174–178 MB RSS at READY / 6.5 MB minified to 103 MB / 2.0 MB once this was narrowed.
 */
const POD_SPECIFIER_REDIRECTS = [
  { specifier: '@kbn/core/server', to: port('core_server.ts') },
  {
    specifier: '@kbn/task-manager-plugin/server',
    importer: /alerting_v2\/server\/lib\/tasks\/invalidate_pending_api_keys\//,
    to: port('task_manager_server_with_invalidate.ts'),
  },
  { specifier: '@kbn/task-manager-plugin/server', to: port('task_manager_server.ts') },
];

/**
 * Resolved-path redirects. `connector_executor.ts` is imported unconditionally by the Workflows
 * step graph (not lazily, only when a connector step is hit), which would otherwise drag the
 * entire `@kbn/actions-plugin/server` implementation into the Workflows pod. Connector steps are
 * their own pod (Stage B2, `pod/entries/connectors.ts`); this stub throws a clear "not bundled"
 * error instead.
 */
const POD_PATH_REDIRECTS = new Map([
  [
    join(
      pluginRoot,
      '../../../../../src/platform/plugins/shared/workflows_execution_engine/server/connector_executor.ts'
    ),
    port('connector_executor.ts'),
  ],
]);

const resolveRelative = (importer, specifier) => {
  const base = resolve(dirname(importer), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) return candidate;
  }
  return undefined;
};

/** Real peggy grammars (KQL, TinyMath): compiled to a real parser, not stubbed as inert text. */
const peggyPlugin = {
  name: 'poc-peggy',
  setup(b) {
    b.onLoad({ filter: /\.peggy$/ }, (args) => {
      const source = readFileSync(args.path, 'utf8');
      const contents = peggy.generate(source, { output: 'source', format: 'commonjs' });
      return { contents, loader: 'js' };
    });
  },
};

const portsPlugin = {
  name: 'poc-ports',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === 'entry-point') return undefined;

      for (const r of POD_SPECIFIER_REDIRECTS) {
        if (args.path === r.specifier && (!r.importer || r.importer.test(args.importer))) {
          return { path: r.to };
        }
      }
      if (args.path.startsWith('.')) {
        const abs = resolveRelative(args.importer, args.path);
        if (abs && POD_PATH_REDIRECTS.has(abs)) return { path: POD_PATH_REDIRECTS.get(abs) };
      }
      return undefined;
    });
  },
};

const buildOne = async (entry, outfile) => {
  const result = await build({
    entryPoints: [resolve(here, entry)],
    outfile: resolve(here, outfile),
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    tsconfig: join(pluginRoot, 'tsconfig.json'),
    sourcemap: true,
    minify,
    metafile: true,
    // ESM-only deps (antlr4) call createRequire(import.meta.url), which is undefined in CJS output.
    define: { 'import.meta.url': '__poc_import_meta_url' },
    banner: { js: "const __poc_import_meta_url = require('url').pathToFileURL(__filename).href;" },
    logLevel: 'warning',
    logLimit: 0,
    plugins: [peggyPlugin, portsPlugin],
  });

  const outPath = resolve(here, outfile);
  const metaPath = outPath.replace(/\.js$/, '.meta.json');
  writeFileSync(metaPath, JSON.stringify(result.metafile));
  console.log(`built ${outfile} (metafile ${metaPath})`);
};

if (all) {
  const PODS = [
    ['pod/main_alerting_v2.ts', 'out/pod_alerting_v2.js'],
    ['pod/main_notification_center.ts', 'out/pod_notification_center.js'],
    ['pod/main_workflows.ts', 'out/pod_workflows.js'],
    ['pod/main_connectors.ts', 'out/pod_connectors.js'],
    ['pod/main_size_only_all_connectors.ts', 'out/size_only_all_connectors.js'],
  ];
  for (const [entry, outfile] of PODS) {
    await buildOne(entry, outfile);
  }
} else {
  const entry = getArg('--entry');
  const outfile = getArg('--out');
  if (!entry || !outfile) {
    console.error('usage: node build.mjs --entry <path> --out <path> [--minify]  |  node build.mjs --all [--minify]');
    process.exit(2);
  }
  await buildOne(entry, outfile);
}
