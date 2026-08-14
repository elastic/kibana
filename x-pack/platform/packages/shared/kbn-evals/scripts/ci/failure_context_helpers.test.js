/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const {
  failureLogMetadataKey,
  failureLogMetadataKeysForProject,
} = require('./failure_context_helpers');

const SUITE = 'significant-events';

describe('failureLogMetadataKey', () => {
  it('slugifies the suite and project into a stable key', () => {
    expect(failureLogMetadataKey(SUITE, 'eis/openai-gpt-5.4')).toBe(
      'kbn-evals:suite-failure-log:significant-events:eis-openai-gpt-5-4'
    );
  });
});

describe('failureLogMetadataKeysForProject', () => {
  const base = failureLogMetadataKey(SUITE, 'gpt-5');

  it('returns only the unsharded key when no shard keys were recorded', () => {
    expect(failureLogMetadataKeysForProject([], SUITE, 'gpt-5')).toEqual([base]);
  });

  it('returns the unsharded key first, then the shard keys in a stable order', () => {
    const keys = [
      `${base}:features`,
      'kbn-evals:suite-failures:significant-events:gpt-5',
      `${base}:discovery-and-queries`,
      base,
    ];

    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5')).toEqual([
      base,
      `${base}:discovery-and-queries`,
      `${base}:features`,
    ]);
  });

  it('does not bleed shards of a model whose slug is a prefix of another model', () => {
    const miniBase = failureLogMetadataKey(SUITE, 'gpt-5-mini');
    const keys = [`${base}:features`, `${miniBase}:features`];

    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5')).toEqual([
      base,
      `${base}:features`,
    ]);
    expect(failureLogMetadataKeysForProject(keys, SUITE, 'gpt-5-mini')).toEqual([
      miniBase,
      `${miniBase}:features`,
    ]);
  });
});
