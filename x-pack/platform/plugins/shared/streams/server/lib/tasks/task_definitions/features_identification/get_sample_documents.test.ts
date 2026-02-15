/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  discoverMessagePatterns,
  type DiscoverPatternsResult,
} from '../../../../routes/utils/discover_message_patterns';
import {
  getSampleDocuments,
  MAX_EXCLUSION_PATTERNS,
  MAX_DISCOVERED_PATTERNS,
  MIN_NEW_PATTERNS,
} from './get_sample_documents';

jest.mock('../../../../routes/utils/discover_message_patterns');

const mockedDiscoverMessagePatterns = jest.mocked(discoverMessagePatterns);

const esClient = {} as ElasticsearchClient;

const DEFAULT_LAST_PATTERN_RESET_AT = 1_700_000_000_000;

const baseParams: Parameters<typeof getSampleDocuments>[0] = {
  esClient,
  index: 'test-index',
  start: 0,
  end: 1000,
  discoveredPatterns: [],
  lastPatternResetAt: DEFAULT_LAST_PATTERN_RESET_AT,
};

const makeCategory = ({
  pattern,
  isMeaningfulPattern = true,
  doc = { message: `sample for ${pattern}` },
}: {
  pattern: string;
  isMeaningfulPattern?: boolean;
  doc?: Record<string, unknown>;
}) => ({
  pattern,
  sampleDocuments: [doc],
  isMeaningfulPattern,
});

const mockResult = ({
  categories = [],
  randomSampleDocuments = [],
}: Partial<DiscoverPatternsResult> = {}): DiscoverPatternsResult => ({
  categories,
  randomSampleDocuments,
  categorizationField: 'message',
});

const firstDiscoverCall = (): Parameters<typeof discoverMessagePatterns>[0] => {
  const firstCall = mockedDiscoverMessagePatterns.mock.calls[0]?.[0];
  if (!firstCall) {
    throw new Error('Expected discoverMessagePatterns to be called');
  }

  return firstCall;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('getSampleDocuments', () => {
  describe('hybrid exclusion strategy', () => {
    it('passes the first MAX_EXCLUSION_PATTERNS patterns as excludePatterns', async () => {
      const patterns = Array.from({ length: 80 }, (_, i) => `pattern-${i}`);
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult());
      await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: patterns,
      });

      expect(mockedDiscoverMessagePatterns).toHaveBeenCalledTimes(1);
      const call = firstDiscoverCall();
      expect(call.excludePatterns).toEqual(patterns.slice(0, MAX_EXCLUSION_PATTERNS));
    });

    it('passes undefined excludePatterns when discoveredPatterns is empty', async () => {
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult());
      await getSampleDocuments(baseParams);

      const call = firstDiscoverCall();
      expect(call.excludePatterns).toBeUndefined();
    });

    it('computes categorySize to cover non-excluded known patterns + desired new', async () => {
      const patterns = Array.from({ length: 80 }, (_, i) => `pattern-${i}`);
      const size = 20;
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult());
      await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: patterns,
        size,
      });

      const nonExcludedKnown = patterns.length - MAX_EXCLUSION_PATTERNS;
      const expectedCategorySize = nonExcludedKnown + size;
      const call = firstDiscoverCall();
      expect(call.categorySize).toBe(expectedCategorySize);
    });

    it('uses size as minimum categorySize when few patterns are known', async () => {
      const size = 20;
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult());
      await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: ['p1', 'p2'],
        size,
      });

      const call = firstDiscoverCall();
      expect(call.categorySize).toBe(size);
    });
  });

  describe('client-side dedup', () => {
    it('filters out already-known patterns from returned categories', async () => {
      mockedDiscoverMessagePatterns.mockResolvedValue(
        mockResult({
          categories: [
            makeCategory({ pattern: 'known-pattern' }),
            makeCategory({ pattern: 'new-pattern-1' }),
            makeCategory({ pattern: 'new-pattern-2' }),
          ],
        })
      );
      const result = await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: ['known-pattern'],
      });

      // new patterns should be appended, known-pattern should not be duplicated
      expect(result.updatedPatterns).toContain('new-pattern-1');
      expect(result.updatedPatterns).toContain('new-pattern-2');
      expect(result.updatedPatterns.filter((p) => p === 'known-pattern')).toHaveLength(1);
    });

    it('only persists meaningful new patterns', async () => {
      mockedDiscoverMessagePatterns.mockResolvedValue(
        mockResult({
          categories: [
            makeCategory({ pattern: 'a-meaningful-new', isMeaningfulPattern: true }),
            makeCategory({ pattern: 'short-new', isMeaningfulPattern: false }),
            makeCategory({ pattern: 'another-meaningful-new', isMeaningfulPattern: true }),
          ],
        })
      );
      const result = await getSampleDocuments({
        ...baseParams,
      });

      expect(result.updatedPatterns).toContain('a-meaningful-new');
      expect(result.updatedPatterns).toContain('another-meaningful-new');
      expect(result.updatedPatterns).not.toContain('short-new');
    });
  });

  describe('sample document assembly', () => {
    it('uses category documents first, then fills with random docs', async () => {
      const catDoc = { message: 'from category' };
      const randomDoc = { message: 'random' };
      mockedDiscoverMessagePatterns.mockResolvedValue(
        mockResult({
          categories: [makeCategory({ pattern: 'new-p1', doc: catDoc })],
          randomSampleDocuments: [randomDoc, randomDoc, randomDoc],
        })
      );
      const result = await getSampleDocuments({
        ...baseParams,
        size: 3,
      });

      expect(result.sampleDocuments[0]).toBe(catDoc);
      expect(result.sampleDocuments).toHaveLength(3);
    });

    it('caps sample documents at size', async () => {
      const categories = Array.from({ length: 10 }, (_, i) => makeCategory({ pattern: `p-${i}` }));
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult({ categories }));
      const result = await getSampleDocuments({
        ...baseParams,
        size: 5,
      });

      expect(result.sampleDocuments).toHaveLength(5);
    });
  });

  describe('pattern reset on exhaustion', () => {
    it('resets patterns when fewer than MIN_NEW_PATTERNS new patterns are found', async () => {
      const resetAt = Date.now() - 1000;
      mockedDiscoverMessagePatterns.mockResolvedValue(
        mockResult({
          categories: [makeCategory({ pattern: 'known' })],
        })
      );
      const result = await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: ['known'],
        lastPatternResetAt: resetAt,
      });

      // 0 new meaningful patterns < MIN_NEW_PATTERNS → reset
      expect(result.updatedPatterns).toEqual([]);
      expect(result.lastPatternResetAt).toBeGreaterThan(resetAt);
    });

    it('resets when zero categories are returned', async () => {
      const resetAt = Date.now() - 1000;
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult());
      const result = await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: ['p1', 'p2'],
        lastPatternResetAt: resetAt,
      });

      expect(result.updatedPatterns).toEqual([]);
      expect(result.lastPatternResetAt).toBeGreaterThan(resetAt);
    });

    it('preserves lastPatternResetAt when enough new patterns are found', async () => {
      const newCategories = Array.from({ length: MIN_NEW_PATTERNS }, (_, i) =>
        makeCategory({ pattern: `new-${i}` })
      );
      const resetAt = Date.now() - 5000;
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult({ categories: newCategories }));
      const result = await getSampleDocuments({
        ...baseParams,
        lastPatternResetAt: resetAt,
      });

      expect(result.lastPatternResetAt).toBe(resetAt);
      expect(result.updatedPatterns).toHaveLength(MIN_NEW_PATTERNS);
    });
  });

  describe('MAX_DISCOVERED_PATTERNS cap', () => {
    it('caps total patterns at MAX_DISCOVERED_PATTERNS', async () => {
      const existing = Array.from({ length: MAX_DISCOVERED_PATTERNS - 1 }, (_, i) => `old-${i}`);
      const newCategories = Array.from({ length: 5 }, (_, i) =>
        makeCategory({ pattern: `new-${i}` })
      );
      mockedDiscoverMessagePatterns.mockResolvedValue(mockResult({ categories: newCategories }));
      const result = await getSampleDocuments({
        ...baseParams,
        discoveredPatterns: existing,
      });

      expect(result.updatedPatterns).toHaveLength(MAX_DISCOVERED_PATTERNS);
      // First entries are the old patterns, new ones are appended
      expect(result.updatedPatterns[0]).toBe('old-0');
      expect(result.updatedPatterns[MAX_DISCOVERED_PATTERNS - 1]).toBe('new-0');
    });
  });
});
