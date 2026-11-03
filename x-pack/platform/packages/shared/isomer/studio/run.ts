/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const studioVersion = '0.4.0';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../../..');
const output = resolve(root, 'target/isomer-studio');
const report = resolve(root, 'target/junit/isomer-studio.xml');
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { port: { type: 'string' } },
});
const [command = 'dev', ...extra] = positionals;
if (!['dev', 'build', 'check'].includes(command) || extra.length) {
  throw new Error(
    'Usage: node x-pack/platform/packages/shared/isomer/studio/run.ts dev|build|check [--port <port>]'
  );
}
if (values.port !== undefined && command !== 'dev') {
  throw new Error('--port is only supported for dev');
}

const args = [
  '--yes',
  `--package=@elastic/isomer-studio@${studioVersion}`,
  'isomer-studio',
  command,
  '--cwd',
  root,
  '--config',
  resolve(here, 'isomer_studio.config.ts'),
  ...(command === 'build' ? ['--out', output, '--base', './'] : []),
  ...(command === 'check' ? ['--format', 'junit', '--report', report] : []),
  ...(values.port === undefined ? [] : ['--port', values.port]),
];
const guard = pathToFileURL(resolve(here, 'no_image_backend.ts')).href;
const child = spawn('npx', args, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${guard}`,
  },
});
child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  if (code !== 0 || signal) {
    process.exitCode = code ?? 1;
    return;
  }
  if (command === 'build') {
    const git = (...gitArgs: string[]): string =>
      execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).trim();
    mkdirSync(output, { recursive: true });
    writeFileSync(
      resolve(output, 'build.json'),
      `${JSON.stringify(
        {
          sourceSha: git('rev-parse', 'HEAD'),
          dirty: git('status', '--porcelain', '--untracked-files=normal') !== '',
          studioVersion,
          buildId: process.env.BUILDKITE_BUILD_ID,
          buildNumber: process.env.BUILDKITE_BUILD_NUMBER,
          jobId: process.env.BUILDKITE_JOB_ID,
          buildUrl: process.env.BUILDKITE_BUILD_URL,
          requestedCommit: process.env.BUILDKITE_COMMIT,
        },
        null,
        2
      )}\n`
    );
  }
});
