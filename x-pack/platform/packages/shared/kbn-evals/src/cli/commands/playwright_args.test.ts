/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPlaywrightArgs } from './playwright_args';

const CONFIG = 'x-pack/platform/packages/shared/kbn-evals-suite-significant-events/config.ts';
const SPEC_FILES = ['evals/discovery/discovery.spec.ts', 'evals/ki_query_generation/ki.spec.ts'];

const indexOfArg = (args: string[], arg: string) => args.indexOf(arg);

describe('buildPlaywrightArgs', () => {
  it('always points Playwright at the resolved config', () => {
    const args = buildPlaywrightArgs({ configPath: CONFIG });

    expect(args).toEqual(['scripts/playwright', 'test', '--config', CONFIG]);
  });

  it('keeps spec files ahead of --project', () => {
    // `--project` is variadic: a filter after it is read as another project name, and CI dies with
    // `Project(s) "evals/discovery/discovery.spec.ts" not found` instead of running the shard.
    const args = buildPlaywrightArgs({
      configPath: CONFIG,
      specFiles: SPEC_FILES,
      project: 'eis-anthropic-claude-4-6-sonnet',
    });

    for (const specFile of SPEC_FILES) {
      expect(indexOfArg(args, specFile)).toBeLessThan(indexOfArg(args, '--project'));
    }
  });

  it('keeps spec files ahead of every flag, not just --project', () => {
    // Flag order here is incidental, so pin the property rather than the exact argv.
    const args = buildPlaywrightArgs({
      configPath: CONFIG,
      specFiles: SPEC_FILES,
      project: 'eis-openai-gpt-5-4',
      grep: 'KI query generation',
      grepInvert: 'flaky',
    });

    const lastSpecFile = Math.max(...SPEC_FILES.map((specFile) => indexOfArg(args, specFile)));
    const firstFlag = Math.min(
      ...['--project', '--grep', '--grep-invert'].map((flag) => indexOfArg(args, flag))
    );

    expect(lastSpecFile).toBeLessThan(firstFlag);
  });

  it('omits filters that were not requested', () => {
    const args = buildPlaywrightArgs({ configPath: CONFIG, grep: 'only this' });

    expect(args).not.toContain('--project');
    expect(args).not.toContain('--grep-invert');
    expect(args).toEqual(expect.arrayContaining(['--grep', 'only this']));
  });

  it('never separates spec files with --, which Playwright ignores', () => {
    const args = buildPlaywrightArgs({
      configPath: CONFIG,
      specFiles: SPEC_FILES,
      project: 'eis-openai-gpt-5-4',
    });

    expect(args).not.toContain('--');
  });
});
