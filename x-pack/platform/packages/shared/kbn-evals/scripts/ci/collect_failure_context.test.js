/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

const { execFileSync } = require('child_process');
const { collectFailureContext } = require('./collect_failure_context');
const { MAX_LOG_EXCERPT_CHARS, failureLogMetadataKey } = require('./failure_context_helpers');

const SUITE = 'significant-events';
const MODEL = 'gpt-5';
const BASE = failureLogMetadataKey(SUITE, MODEL);

/**
 * Stands in for the `buildkite-agent meta-data` calls the collector shells out to.
 * @param {Record<string, string>} metadata
 */
function mockBuildkiteMetadata(metadata) {
  execFileSync.mockImplementation((_command, args) => {
    const [, subcommand, key] = args;
    if (subcommand === 'keys') {
      return Object.keys(metadata).join('\n');
    }
    if (subcommand === 'get' && metadata[key] !== undefined) {
      return metadata[key];
    }
    throw new Error(`no metadata for ${key}`);
  });
}

const collect = () =>
  collectFailureContext({
    suiteId: SUITE,
    suiteName: 'Significant Events',
    failingProjects: [MODEL],
  });

describe('collectFailureContext', () => {
  beforeEach(() => {
    execFileSync.mockReset();
  });

  it('labels each shard excerpt so triage can tell them apart', () => {
    mockBuildkiteMetadata({
      [`${BASE}:discovery-and-queries`]: 'timed out waiting for onboarding',
      [`${BASE}:feature-extraction`]: 'connector returned 429',
    });

    const { models } = collect();

    expect(models[MODEL].logExcerpt).toBe(
      '[shard: discovery-and-queries]\ntimed out waiting for onboarding\n\n' +
        '[shard: feature-extraction]\nconnector returned 429'
    );
  });

  it('leaves an unsharded excerpt unlabelled', () => {
    mockBuildkiteMetadata({ [BASE]: 'plain failure' });

    expect(collect().models[MODEL].logExcerpt).toBe('plain failure');
  });

  it('splits the excerpt budget so one shard cannot evict the others', () => {
    mockBuildkiteMetadata({
      [`${BASE}:one`]: 'x'.repeat(MAX_LOG_EXCERPT_CHARS),
      [`${BASE}:two`]: 'y'.repeat(MAX_LOG_EXCERPT_CHARS),
    });

    const { logExcerpt } = collect().models[MODEL];

    // Neither shard is dropped, and each keeps an equal share of the budget.
    expect((logExcerpt.match(/x/g) || []).length).toBe(MAX_LOG_EXCERPT_CHARS / 2);
    expect((logExcerpt.match(/y/g) || []).length).toBe(MAX_LOG_EXCERPT_CHARS / 2);
  });

  it('redacts secrets in every shard excerpt', () => {
    mockBuildkiteMetadata({
      [`${BASE}:one`]: 'api_key=sk-abcdefghijklmnopqrstuvwxyz',
      [`${BASE}:two`]: 'Authorization: Bearer abcdef.123456',
    });

    const { logExcerpt } = collect().models[MODEL];

    expect(logExcerpt).not.toMatch(/sk-abcdef/);
    expect(logExcerpt).not.toMatch(/Bearer abcdef/);
    expect(logExcerpt.match(/\[REDACTED\]/g)).toHaveLength(2);
  });

  it('records an empty entry for a model with no recorded excerpt', () => {
    mockBuildkiteMetadata({});

    expect(collect().models[MODEL]).toEqual({});
  });
});
