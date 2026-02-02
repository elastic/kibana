/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateEvalThreadId, isValidEvalThreadId, parseEvalThreadIdSeed } from './eval_thread_id';

describe('generateEvalThreadId', () => {
  describe('random mode (no options)', () => {
    it('should generate a valid UUID when called without options', () => {
      const threadId = generateEvalThreadId();

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should generate different UUIDs on subsequent calls', () => {
      const threadId1 = generateEvalThreadId();
      const threadId2 = generateEvalThreadId();

      expect(threadId1).not.toBe(threadId2);
    });
  });

  describe('deterministic mode (with options)', () => {
    it('should generate a valid UUID with options', () => {
      const threadId = generateEvalThreadId({
        datasetName: 'test-dataset',
        exampleIndex: 0,
        repetition: 1,
        runId: 'run-123',
      });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should generate consistent UUIDs for the same options', () => {
      const options = {
        datasetName: 'test-dataset',
        exampleIndex: 5,
        repetition: 2,
        runId: 'run-abc',
      };

      const threadId1 = generateEvalThreadId(options);
      const threadId2 = generateEvalThreadId(options);

      expect(threadId1).toBe(threadId2);
    });

    it('should generate different UUIDs for different datasetName', () => {
      const baseOptions = {
        exampleIndex: 0,
        repetition: 1,
        runId: 'run-123',
      };

      const threadId1 = generateEvalThreadId({ ...baseOptions, datasetName: 'dataset-a' });
      const threadId2 = generateEvalThreadId({ ...baseOptions, datasetName: 'dataset-b' });

      expect(threadId1).not.toBe(threadId2);
    });

    it('should generate different UUIDs for different exampleIndex', () => {
      const baseOptions = {
        datasetName: 'test-dataset',
        repetition: 1,
        runId: 'run-123',
      };

      const threadId1 = generateEvalThreadId({ ...baseOptions, exampleIndex: 0 });
      const threadId2 = generateEvalThreadId({ ...baseOptions, exampleIndex: 1 });

      expect(threadId1).not.toBe(threadId2);
    });

    it('should generate different UUIDs for different repetition', () => {
      const baseOptions = {
        datasetName: 'test-dataset',
        exampleIndex: 0,
        runId: 'run-123',
      };

      const threadId1 = generateEvalThreadId({ ...baseOptions, repetition: 1 });
      const threadId2 = generateEvalThreadId({ ...baseOptions, repetition: 2 });

      expect(threadId1).not.toBe(threadId2);
    });

    it('should generate different UUIDs for different runId', () => {
      const baseOptions = {
        datasetName: 'test-dataset',
        exampleIndex: 0,
        repetition: 1,
      };

      const threadId1 = generateEvalThreadId({ ...baseOptions, runId: 'run-123' });
      const threadId2 = generateEvalThreadId({ ...baseOptions, runId: 'run-456' });

      expect(threadId1).not.toBe(threadId2);
    });

    it('should work with partial options (only datasetName)', () => {
      const threadId = generateEvalThreadId({ datasetName: 'my-dataset' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should work with partial options (only exampleIndex)', () => {
      const threadId = generateEvalThreadId({ exampleIndex: 42 });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should work with partial options (only repetition)', () => {
      const threadId = generateEvalThreadId({ repetition: 3 });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should work with partial options (only runId)', () => {
      const threadId = generateEvalThreadId({ runId: 'unique-run' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should generate deterministic IDs with partial options', () => {
      const options = { datasetName: 'test', exampleIndex: 1 };

      const threadId1 = generateEvalThreadId(options);
      const threadId2 = generateEvalThreadId(options);

      expect(threadId1).toBe(threadId2);
    });
  });

  describe('custom seed mode', () => {
    it('should generate a valid UUID with custom seed', () => {
      const threadId = generateEvalThreadId({ seed: 'my-custom-seed' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should generate consistent UUIDs for the same seed', () => {
      const threadId1 = generateEvalThreadId({ seed: 'consistent-seed' });
      const threadId2 = generateEvalThreadId({ seed: 'consistent-seed' });

      expect(threadId1).toBe(threadId2);
    });

    it('should generate different UUIDs for different seeds', () => {
      const threadId1 = generateEvalThreadId({ seed: 'seed-1' });
      const threadId2 = generateEvalThreadId({ seed: 'seed-2' });

      expect(threadId1).not.toBe(threadId2);
    });

    it('should prioritize seed over other options', () => {
      const withSeed = generateEvalThreadId({
        seed: 'priority-seed',
        datasetName: 'ignored-dataset',
        exampleIndex: 99,
      });
      const onlySeed = generateEvalThreadId({ seed: 'priority-seed' });

      expect(withSeed).toBe(onlySeed);
    });
  });

  describe('fallback to random mode', () => {
    it('should generate random UUID when options object is empty', () => {
      const threadId1 = generateEvalThreadId({});
      const threadId2 = generateEvalThreadId({});

      expect(isValidEvalThreadId(threadId1)).toBe(true);
      expect(isValidEvalThreadId(threadId2)).toBe(true);
      expect(threadId1).not.toBe(threadId2);
    });

    it('should generate random UUID when all options are undefined', () => {
      const threadId1 = generateEvalThreadId({
        datasetName: undefined,
        exampleIndex: undefined,
        repetition: undefined,
        runId: undefined,
      });
      const threadId2 = generateEvalThreadId({
        datasetName: undefined,
        exampleIndex: undefined,
        repetition: undefined,
        runId: undefined,
      });

      expect(isValidEvalThreadId(threadId1)).toBe(true);
      expect(isValidEvalThreadId(threadId2)).toBe(true);
      expect(threadId1).not.toBe(threadId2);
    });
  });

  describe('edge cases', () => {
    it('should handle exampleIndex of 0', () => {
      const threadId = generateEvalThreadId({ exampleIndex: 0 });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should handle repetition of 0', () => {
      const threadId = generateEvalThreadId({ repetition: 0 });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should handle empty string datasetName', () => {
      const threadId = generateEvalThreadId({ datasetName: '' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should handle empty string runId', () => {
      const threadId = generateEvalThreadId({ runId: '' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should handle special characters in datasetName', () => {
      const threadId = generateEvalThreadId({ datasetName: 'test/dataset:with|special-chars' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });

    it('should handle special characters in seed', () => {
      const threadId = generateEvalThreadId({ seed: 'test/seed:with|special-chars' });

      expect(isValidEvalThreadId(threadId)).toBe(true);
    });
  });
});

describe('isValidEvalThreadId', () => {
  it('should return true for valid lowercase UUIDs', () => {
    expect(isValidEvalThreadId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return true for valid uppercase UUIDs', () => {
    expect(isValidEvalThreadId('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('should return true for valid mixed case UUIDs', () => {
    expect(isValidEvalThreadId('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isValidEvalThreadId('')).toBe(false);
  });

  it('should return false for random strings', () => {
    expect(isValidEvalThreadId('not-a-uuid')).toBe(false);
  });

  it('should return false for UUIDs without dashes', () => {
    expect(isValidEvalThreadId('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('should return false for UUIDs with wrong segment lengths', () => {
    expect(isValidEvalThreadId('550e840-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isValidEvalThreadId('550e8400-e29-41d4-a716-446655440000')).toBe(false);
  });

  it('should return false for UUIDs with invalid characters', () => {
    expect(isValidEvalThreadId('550e8400-e29b-41d4-a716-44665544000g')).toBe(false);
    expect(isValidEvalThreadId('550e8400-e29b-41d4-a716-44665544000!')).toBe(false);
  });

  it('should return false for UUIDs with extra characters', () => {
    expect(isValidEvalThreadId('550e8400-e29b-41d4-a716-4466554400001')).toBe(false);
    expect(isValidEvalThreadId('a550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });
});

describe('parseEvalThreadIdSeed', () => {
  it('should parse a seed with all components', () => {
    const seed = 'dataset:my-dataset|example:5|rep:2|run:run-123';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({
      datasetName: 'my-dataset',
      exampleIndex: 5,
      repetition: 2,
      runId: 'run-123',
    });
  });

  it('should parse a seed with only datasetName', () => {
    const seed = 'dataset:test-dataset';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ datasetName: 'test-dataset' });
  });

  it('should parse a seed with only exampleIndex', () => {
    const seed = 'example:42';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ exampleIndex: 42 });
  });

  it('should parse a seed with only repetition', () => {
    const seed = 'rep:3';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ repetition: 3 });
  });

  it('should parse a seed with only runId', () => {
    const seed = 'run:unique-run-id';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ runId: 'unique-run-id' });
  });

  it('should parse a seed with partial components', () => {
    const seed = 'dataset:my-dataset|rep:1';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({
      datasetName: 'my-dataset',
      repetition: 1,
    });
  });

  it('should return null for empty seed', () => {
    const result = parseEvalThreadIdSeed('');

    expect(result).toBeNull();
  });

  it('should return null for seed with no recognized components', () => {
    const result = parseEvalThreadIdSeed('unknown:value|other:data');

    expect(result).toBeNull();
  });

  it('should handle seed with empty values', () => {
    const seed = 'dataset:|example:0';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({
      datasetName: '',
      exampleIndex: 0,
    });
  });

  it('should handle NaN for non-numeric example index', () => {
    const seed = 'example:not-a-number';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ exampleIndex: NaN });
  });

  it('should handle NaN for non-numeric repetition', () => {
    const seed = 'rep:invalid';
    const result = parseEvalThreadIdSeed(seed);

    expect(result).toEqual({ repetition: NaN });
  });
});
