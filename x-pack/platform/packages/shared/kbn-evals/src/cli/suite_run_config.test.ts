/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { FlagsReader } from '@kbn/dev-cli-runner';
import { resolveEvalSuites } from './suites';
import { readSuiteRunEnv } from './suite_run_config';

let repoRoot: string;
beforeEach(() => {
  repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'evals-suite-config-'));
  Fs.mkdirSync(Path.join(repoRoot, '.buildkite/pipelines/evals'), { recursive: true });
  Fs.writeFileSync(Path.join(repoRoot, 'playwright.config.ts'), '');
  Fs.writeFileSync(
    Path.join(repoRoot, 'run_config.js'),
    `
    exports.runConfig = {
      options: ['dataset-id', 'concurrency'],
      resolve: ({ options }) => ({
        playwright: { EXAMPLE_DATASET: options['dataset-id'] || 'default' },
        server: { EXAMPLE_WORKERS: options.concurrency || '4' },
      }),
    };
  `
  );
  Fs.writeFileSync(
    Path.join(repoRoot, '.buildkite/pipelines/evals/evals.suites.json'),
    JSON.stringify({
      suites: [
        { id: 'another-suite', configPath: 'playwright.config.ts', runConfigPath: 'run_config.js' },
      ],
    })
  );
});
afterEach(() => Fs.rmSync(repoRoot, { recursive: true, force: true }));

it('loads a registered suite configuration and separates server and client settings', async () => {
  const [suite] = resolveEvalSuites(repoRoot);
  expect(
    await readSuiteRunEnv(
      repoRoot,
      new FlagsReader({ 'dataset-id': 'stored', concurrency: '16' }),
      suite
    )
  ).toEqual({ playwright: { EXAMPLE_DATASET: 'stored' }, server: { EXAMPLE_WORKERS: '16' } });
});

it('resolves suite defaults even without CLI options', async () => {
  const [suite] = resolveEvalSuites(repoRoot);
  expect(await readSuiteRunEnv(repoRoot, new FlagsReader({}), suite)).toEqual({
    playwright: { EXAMPLE_DATASET: 'default' },
    server: { EXAMPLE_WORKERS: '4' },
  });
});

it('keeps suites without a run configuration unchanged', async () => {
  const [suite] = resolveEvalSuites(repoRoot);
  expect(
    await readSuiteRunEnv(repoRoot, new FlagsReader({}), { ...suite, runConfigPath: undefined })
  ).toEqual({ playwright: {}, server: {} });
});

it('reports unsupported options without restricting them to a particular suite', async () => {
  await expect(
    readSuiteRunEnv(repoRoot, new FlagsReader({ 'dataset-id': 'stored' }))
  ).rejects.toThrow('does not declare support for --dataset-id');
});

it.each([
  'exports.somethingElse = {};',
  'exports.runConfig = { options: ["unsupported"], resolve: () => ({}) };',
  'exports.runConfig = { options: [] };',
])(
  'rejects malformed registered configuration instead of silently falling back',
  async (source) => {
    Fs.writeFileSync(Path.join(repoRoot, 'invalid_config.js'), source);
    const [suite] = resolveEvalSuites(repoRoot);
    await expect(
      readSuiteRunEnv(repoRoot, new FlagsReader({}), {
        ...suite,
        runConfigPath: 'invalid_config.js',
      })
    ).rejects.toThrow('Invalid suite run configuration at invalid_config.js');
  }
);
