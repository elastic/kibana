/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSimilarityEvaluator } from '.';

describe('createSimilarityEvaluator', () => {
  const evaluator = createSimilarityEvaluator();

  it('returns 1.0 for identical strings', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'The quick brown fox jumps over the lazy dog',
      expected: 'The quick brown fox jumps over the lazy dog',
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1.0);
    expect(result.label).toBe('similar');
  });

  it('returns high score for very similar strings', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'The quick brown fox jumps over the lazy dog',
      expected: 'A quick brown fox jumped over a lazy dog',
      metadata: null,
    });

    expect(result.score!).toBeGreaterThan(0.5);
  });

  it('returns low score for completely different strings', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'Elasticsearch is a distributed search engine',
      expected: 'The weather today is sunny and warm',
      metadata: null,
    });

    expect(result.score!).toBeLessThan(0.3);
    expect(result.label).toBe('dissimilar');
  });

  it('handles both empty strings', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: '',
      expected: '',
      metadata: null,
    });

    expect(result.score).toBe(1.0);
  });

  it('handles one empty string', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'some text here',
      expected: '',
      metadata: null,
    });

    expect(result.score).toBe(0.0);
    expect(result.label).toBe('dissimilar');
  });

  it('is case insensitive', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'HELLO WORLD',
      expected: 'hello world',
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1.0);
  });

  it('ignores punctuation', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'Hello, world!',
      expected: 'Hello world',
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1.0);
  });

  it('respects custom threshold for labeling', async () => {
    const strictEvaluator = createSimilarityEvaluator({ threshold: 0.95 });

    const result = await strictEvaluator.evaluate({
      input: {},
      output: 'The fox jumps over the dog',
      expected: 'The quick brown fox jumps over the lazy dog',
      metadata: null,
    });

    expect(result.label).toBe('dissimilar');
  });

  it('handles non-string outputs via JSON serialization', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { message: 'hello world' },
      expected: { message: 'hello world' },
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1.0);
  });

  it('handles non-string outputs with different key order', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: { hello: 'world', message: 'hello world' },
      expected: { message: 'hello world', hello: 'world' },
      metadata: null,
    });

    expect(result.score).toBeCloseTo(1.0);
  });

  it('handles undefined expected gracefully', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: 'some text',
      expected: undefined,
      metadata: null,
    });

    expect(result.score).toBe(0.0);
    expect(result.label).toBe('dissimilar');
  });

  it('handles both null expected and output', async () => {
    const result = await evaluator.evaluate({
      input: {},
      output: null,
      expected: null,
      metadata: null,
    });

    expect(result.score).toBe(1.0);
  });
});
