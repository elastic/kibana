/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const Fs = require('fs');
const Path = require('path');
const { slugifyId } = require('./slugify_id');

/**
 * Byte-for-byte copy of `normalizeBuildkiteKey` in
 * `.buildkite/pipelines/evals/eval_pipeline.ts`. Kept here so the kbn-evals
 * generator and the Buildkite fanout agree on connector ids.
 */
function normalizeBuildkiteKey(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const EVAL_PIPELINE_PATH = Path.resolve(
  __dirname,
  '../../../../../../../.buildkite/pipelines/evals/eval_pipeline.ts'
);

const SLUG_REPLACES = [
  ".replace(/[^a-z0-9_-]+/g, '-')",
  ".replace(/-+/g, '-')",
  ".replace(/^-|-$/g, '')",
];

describe('slugifyId', () => {
  it('is byte-identical to normalizeBuildkiteKey in eval_pipeline.ts', () => {
    const slugifySrc = Fs.readFileSync(Path.join(__dirname, 'slugify_id.js'), 'utf8');
    const pipelineSrc = Fs.readFileSync(EVAL_PIPELINE_PATH, 'utf8');

    expect(pipelineSrc).toContain('function normalizeBuildkiteKey(value: string)');
    for (const replace of SLUG_REPLACES) {
      expect(slugifySrc).toContain(replace);
      expect(pipelineSrc).toContain(replace);
    }
  });

  it('agrees with normalizeBuildkiteKey on native OpenRouter ids, including dots', () => {
    const samples = ['openai/gpt-5.4', 'anthropic/claude-sonnet-4.6', 'openrouter/openai-gpt-5.4'];

    for (const sample of samples) {
      expect(slugifyId(sample)).toBe(normalizeBuildkiteKey(sample));
    }
  });

  it('produces the connector ids Buildkite will compute as openrouter-${normalizeBuildkiteKey(id)}', () => {
    expect(`openrouter-${slugifyId('openai/gpt-5.4')}`).toBe('openrouter-openai-gpt-5-4');
    expect(`openrouter-${slugifyId('anthropic/claude-sonnet-4.6')}`).toBe(
      'openrouter-anthropic-claude-sonnet-4-6'
    );
    expect(`openrouter-${normalizeBuildkiteKey('openai/gpt-5.4')}`).toBe(
      `openrouter-${slugifyId('openai/gpt-5.4')}`
    );
  });
});
