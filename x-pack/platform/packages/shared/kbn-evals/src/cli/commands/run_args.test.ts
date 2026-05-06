/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPlaywrightArgs, parseShard } from './run_args';

describe('parseShard', () => {
  it('parses a valid i/N spec', () => {
    expect(parseShard('1/4')).toEqual({ index: 1, total: 4 });
    expect(parseShard('4/4')).toEqual({ index: 4, total: 4 });
  });

  it('trims surrounding whitespace', () => {
    expect(parseShard('  2/3 ')).toEqual({ index: 2, total: 3 });
  });

  it.each(['', 'abc', '1', '1/', '/4', '1/4/2', '1.0/4', '-1/4'])(
    'rejects malformed input %p',
    (raw) => {
      expect(() => parseShard(raw)).toThrow(/--shard must look like/);
    }
  );

  it('rejects index out of range', () => {
    expect(() => parseShard('0/4')).toThrow(/1 <= i <= N/);
    expect(() => parseShard('5/4')).toThrow(/1 <= i <= N/);
  });

  it('rejects total < 1', () => {
    expect(() => parseShard('0/0')).toThrow(/N must be >= 1/);
  });
});

describe('buildPlaywrightArgs', () => {
  const configPath = '/repo/path/to/playwright.config.ts';

  it('returns the minimal arg set when only configPath is provided', () => {
    expect(buildPlaywrightArgs({ configPath })).toEqual([
      'scripts/playwright',
      'test',
      '--config',
      configPath,
    ]);
  });

  it('appends --project, --grep, --shard, and positionals in order', () => {
    expect(
      buildPlaywrightArgs({
        configPath,
        project: 'gpt-4o',
        grep: 'product documentation',
        shard: { index: 2, total: 4 },
        positionals: ['kb.spec.ts'],
      })
    ).toEqual([
      'scripts/playwright',
      'test',
      '--config',
      configPath,
      '--project',
      'gpt-4o',
      '--grep',
      'product documentation',
      '--shard=2/4',
      'kb.spec.ts',
    ]);
  });

  it('omits shard when not provided', () => {
    const args = buildPlaywrightArgs({ configPath, project: 'gpt-4o' });
    expect(args).not.toContain(expect.stringMatching(/--shard/));
    expect(args.some((a) => a.startsWith('--shard'))).toBe(false);
  });

  it('forwards --shard exactly as i/N', () => {
    const args = buildPlaywrightArgs({
      configPath,
      shard: { index: 1, total: 4 },
    });
    expect(args).toContain('--shard=1/4');
  });
});
