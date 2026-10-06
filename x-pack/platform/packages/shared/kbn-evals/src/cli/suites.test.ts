/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { resolveEvalSuites } from './suites';

describe('resolveEvalSuites', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-suites-'));
    const metadataDir = Path.join(repoRoot, '.buildkite/pipelines/evals');
    Fs.mkdirSync(metadataDir, { recursive: true });
    Fs.writeFileSync(
      Path.join(metadataDir, 'evals.suites.json'),
      JSON.stringify({
        suites: [
          {
            id: 'with-secret',
            configPath: 'x-pack/packages/kbn-evals-suite-with-secret/playwright.config.ts',
            scoutHook: 'x-pack/packages/kbn-evals-suite-with-secret/scout/scout_hook.sh',
            vaultSecret: 'with-secret',
          },
          {
            id: 'without-secret',
            configPath: 'x-pack/packages/kbn-evals-suite-without-secret/playwright.config.ts',
          },
        ],
      })
    );
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it("carries a suite's vaultSecret from evals.suites.json", () => {
    const suites = resolveEvalSuites(repoRoot);

    expect(suites.find(({ id }) => id === 'with-secret')).toMatchObject({
      scoutHook: 'x-pack/packages/kbn-evals-suite-with-secret/scout/scout_hook.sh',
      vaultSecret: 'with-secret',
    });
    expect(suites.find(({ id }) => id === 'without-secret')?.vaultSecret).toBeUndefined();
  });
});
