#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Bundles a task pod: one process that serves the task types of one or more plugins.
 *
 *   node build_task_pod.mjs --plugin <path to a plugin's server/task_pod.ts> [--plugin ...] \
 *     --out out/pod.mjs [--port 4100] [--minify]
 *
 * Each `task_pod.ts` exports `podPlugins: PodPluginDefinition[]` (the plugin's own pod plugin plus
 * any pod plugins for its dependencies). They are merged by id (first wins) into one pod.
 *
 * Plugins import what a pod needs from small packages and subpaths (for example
 * `@kbn/task-manager-plugin/server/task_helpers`), so the bundle stays small; the build fails if a
 * barrel that drags in Core or a whole plugin sneaks back in.
 */

import { build } from 'esbuild';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import peggy from 'peggy';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const args = process.argv.slice(2);
const getAll = (name) =>
  args.flatMap((arg, i) => (arg === name && args[i + 1] ? [args[i + 1]] : []));
const getArg = (name, fallback) => getAll(name)[0] ?? fallback;

const plugins = getAll('--plugin').map((p) => resolve(process.cwd(), p));
const out = resolve(process.cwd(), getArg('--out', 'out/pod.mjs'));
const port = getArg('--port', '4100');
const minify = args.includes('--minify');
const semiSpaceMb = getArg('--semi-space-mb', '8');
const kibanaVersion = JSON.parse(readFileSync(resolve(pluginRoot, '../../../../../package.json'), 'utf8')).version;

if (!plugins.length) {
  console.error('usage: node build_task_pod.mjs --plugin <server/task_pod.ts> [...] --out <file.mjs> [--port N] [--minify]');
  process.exit(2);
}

/**
 * The one package entry replaced at build time. `@kbn/repo-info` walks up from its own directory to
 * find a Kibana checkout's package.json at import time and throws if there is none, which is the
 * case for a pod running on its own; the shim gives it standalone values.
 */
const SHIMS = { '@kbn/repo-info': join(pluginRoot, 'scripts/shims/repo_info.ts') };

const shimsPlugin = {
  name: 'task-pod-shims',
  setup(b) {
    b.onResolve({ filter: /.*/ }, (a) => (SHIMS[a.path] ? { path: SHIMS[a.path] } : undefined));
  },
};

/**
 * Code that must never end up in a pod: it means an import reached for a package barrel (the whole
 * Core boot, the whole Task Manager plugin, the OpenTelemetry SDK) instead of the small package
 * or subpath that has what it needs. Each costs tens of MB of resident memory, silently.
 */
const FORBIDDEN_INPUTS = [
  { pattern: /@kbn\/core-root-server-internal\//, what: 'Core boot (@kbn/core/server barrel?)' },
  { pattern: /task_manager\/server\/plugin\.ts$/, what: 'the Task Manager plugin (@kbn/task-manager-plugin/server barrel?)' },
  { pattern: /node_modules\/@elastic\/opentelemetry-node\//, what: 'the Elastic OpenTelemetry SDK' },
];

const assertNothingForbidden = (metafile) => {
  const failures = [];
  for (const { pattern, what } of FORBIDDEN_INPUTS) {
    const hits = Object.keys(metafile.inputs).filter((input) => pattern.test(input));
    if (!hits.length) continue;
    // Who pulled it in: the first input that imports one of the hits.
    const importers = Object.entries(metafile.inputs)
      .filter(([, v]) => v.imports.some((i) => hits.includes(i.path)))
      .map(([k]) => k)
      .slice(0, 3);
    failures.push(`${what} is bundled (e.g. ${hits[0]}), imported from ${importers.join(', ')}`);
  }
  if (failures.length) {
    console.error(`pod build refused:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
};

/** Real peggy grammars (KQL, TinyMath) compiled to real parsers, not stubbed. */
const peggyPlugin = {
  name: 'task-pod-peggy',
  setup(b) {
    b.onLoad({ filter: /\.peggy$/ }, (a) => {
      // Same options file the repo's peggy loader reads (e.g. KQL's extra start rules).
      const configPath = `${a.path}.config.json`;
      const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf8')) : {};
      return {
        contents: peggy.generate(readFileSync(a.path, 'utf8'), {
          ...config,
          output: 'source',
          format: 'commonjs',
        }),
        loader: 'js',
      };
    });
  },
};

const entry = `import 'reflect-metadata';
import { startPod } from ${JSON.stringify(join(pluginRoot, 'server/task_pod/host/index.ts'))};
${plugins.map((p, i) => `import { podPlugins as p${i} } from ${JSON.stringify(p)};`).join('\n')}

const byId = new Map();
for (const plugin of [${plugins.map((_, i) => `...p${i}`).join(', ')}]) {
  if (!byId.has(plugin.id)) byId.set(plugin.id, plugin);
}
startPod({ plugins: [...byId.values()], defaultPort: ${Number(port)} }).catch((error) => {
  process.stderr.write(\`pod failed to start: \${error.stack ?? error}\\n\`);
  process.exit(1);
});
`;

mkdirSync(dirname(out), { recursive: true });

// ESM with code splitting: parts of the host that most pods never touch (saved objects, the DI
// machinery, the fake request factory) are dynamic imports, so their chunks are only read and
// parsed by pods that use them. One big CJS file would pay for them in every pod's RSS.
const result = await build({
  stdin: { contents: entry, resolveDir: pluginRoot, sourcefile: 'task_pod_main.ts', loader: 'ts' },
  outdir: dirname(out),
  entryNames: basename(out, '.mjs'),
  chunkNames: 'chunks/[name]-[hash]',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  splitting: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  tsconfig: join(pluginRoot, 'tsconfig.json'),
  sourcemap: true,
  minify,
  metafile: true,
  // The pod refuses runs from a Kibana of another version, so it carries the version it was built from.
  define: { __POD_BUILD_VERSION__: JSON.stringify(kibanaVersion) },
  // Bundled CJS dependencies still expect `require`, `__filename` and `__dirname`.
  banner: {
    js: [
      "import { createRequire as __podCreateRequire } from 'node:module';",
      "import { fileURLToPath as __podFileURLToPath } from 'node:url';",
      "import { dirname as __podDirname } from 'node:path';",
      'const require = __podCreateRequire(import.meta.url);',
      'const __filename = __podFileURLToPath(import.meta.url);',
      'const __dirname = __podDirname(__filename);',
    ].join('\n'),
  },
  logLevel: 'warning',
  logLimit: 0,
  plugins: [peggyPlugin, shimsPlugin],
});

const metaPath = out.replace(/\.mjs$/, '.meta.json');
writeFileSync(metaPath, JSON.stringify(result.metafile));
assertNothingForbidden(result.metafile);
console.log(`built ${out} (metafile ${metaPath})`);

// A pod's young generation should stay small: Node sizes it from the machine's heap limit, and a
// boot that allocates a lot leaves it committed (about 110 MB of a 330 MB pod on a 4 GB heap limit).
// It cannot be changed from inside the process, so start the pod through this launcher.
const launcher = out.replace(/\.mjs$/, '.sh');
writeFileSync(
  launcher,
  `#!/bin/sh\nexec node --max-semi-space-size=${semiSpaceMb} --unhandled-rejections=warn "$(dirname "$0")/${basename(out)}" "$@"\n`
);
chmodSync(launcher, 0o755);
console.log(`start it with ${launcher} (caps V8's young generation at ${semiSpaceMb} MB)`);
