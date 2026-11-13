/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builds the render service from this checkout into a Docker context, `<plugin>/target/render_service`:
//
//   node x-pack/platform/plugins/shared/isomer/scripts/render_service/bundle.js
//
// Kibana's own packages (`@kbn/isomer-*`, `@kbn/i18n`, ...) are bundled; the published packages they sit on
// (`@elastic/isomer-*`, React, Elastic Charts, EUI, jsdom, Vega, the native rasterizers) stay external and
// install from npm in the image, pinned to the versions this checkout uses. That split is the one an internal
// publish of the packs would make permanent.

const { execSync } = require('node:child_process');
const { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const esbuild = require('esbuild');

const REPO_ROOT = resolve(__dirname, '../../../../../../..');
const PLUGIN = resolve(__dirname, '../..');
const OUT = join(PLUGIN, 'target/render_service');
const DIST = join(OUT, 'dist');

const rootPackage = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
const versionOf = (name) => {
  const version = rootPackage.dependencies[name] ?? rootPackage.devDependencies[name];
  if (!version) throw new Error(`${name} is not a dependency of this checkout`);
  return version;
};

/** Published packages the bundle imports at runtime. Everything else resolves inside the bundle. */
const EXTERNAL = [
  '@elastic/isomer-sdk',
  '@elastic/isomer-runtime',
  '@elastic/isomer-image-takumi',
  '@elastic/distillate',
  '@elastic/charts',
  '@elastic/eui',
  '@elastic/eui-theme-borealis',
  '@elastic/eui-theme-common',
  '@emotion/react',
  '@emotion/css',
  '@emotion/cache',
  '@napi-rs/canvas',
  'jsdom',
  'react',
  'react-dom',
  'vega',
  'vega-lite',
  'vega-interpreter',
  'vega-tooltip',
  'moment',
  'moment-timezone',
  'lodash',
];
/** Peers of the externals that nothing above names: the image installs with `--legacy-peer-deps`, which adds none. */
const PEERS = ['zod', '@elastic/datemath'];
/** Optional natives the externals probe for; absent in the image, which is fine. */
const OPTIONAL = ['canvas', 'bufferutil', 'utf-8-validate'];

const sha = execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT }).toString().trim();
const dirty = execSync('git status --porcelain', { cwd: REPO_ROOT }).toString().trim()
  ? '-dirty'
  : '';
const build = {
  sha: `${sha}${dirty}`,
  builtAt: new Date().toISOString(),
  versions: Object.fromEntries([...EXTERNAL, ...PEERS].map((name) => [name, versionOf(name)])),
};

const copyAssets = () => {
  const assets = [
    'src/core/packages/apps/server-internal/assets/fonts/inter',
    'src/core/packages/apps/server-internal/assets/fonts/elastic_ui_numeric',
    'x-pack/platform/plugins/shared/maps/test/scout/ui/fixtures/files/world_countries_v7.geo.json',
  ];
  for (const asset of assets) {
    const from = join(REPO_ROOT, asset);
    if (!existsSync(from)) throw new Error(`missing asset ${asset}`);
    cpSync(from, join(DIST, 'kibana', asset), { recursive: true });
  }
};

const run = async () => {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  const result = await esbuild.build({
    absWorkingDir: REPO_ROOT,
    entryPoints: {
      service: join(__dirname, 'service.ts'),
      // The render process, which `createRenderHost` forks as `main.js` beside the file that calls it.
      main: join(PLUGIN, 'server/render_host/main.ts'),
    },
    outdir: DIST,
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'cjs',
    jsx: 'automatic',
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    logLevel: 'warning',
    metafile: true,
    external: [...EXTERNAL.flatMap((name) => [name, `${name}/*`]), ...OPTIONAL],
    alias: { '@kbn/repo-info': join(__dirname, 'repo_info_shim.ts') },
    define: { ISOMER_RENDER_BUILD: JSON.stringify(build), 'process.env.NODE_ENV': '"production"' },
  });

  copyAssets();

  writeFileSync(
    join(OUT, 'package.json'),
    `${JSON.stringify(
      {
        name: 'isomer-render-service',
        version: `0.0.0-${sha}`,
        private: true,
        license: 'Elastic-2.0',
        engines: { node: '>=24' },
        scripts: { start: 'node dist/service.js' },
        dependencies: build.versions,
      },
      null,
      2
    )}\n`
  );
  for (const file of ['Dockerfile', '.dockerignore', 'smoke.sh']) {
    cpSync(join(__dirname, file), join(OUT, file));
  }
  writeFileSync(join(OUT, 'metafile.json'), JSON.stringify(result.metafile));

  const sizes = Object.entries(result.metafile.outputs).map(
    ([file, { bytes }]) =>
      `${file.replace(/^.*target\/render_service\//, '')}  ${(bytes / 1024).toFixed(0)} KB`
  );
  process.stdout.write(`built ${build.sha} into ${OUT}\n${sizes.join('\n')}\n`);
};

run().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exit(1);
});
