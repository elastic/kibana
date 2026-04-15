/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { DedupChecker, NEAR_DUPLICATE_THRESHOLD, RELATED_THRESHOLD } from './dedup_checker';
import type { EmbeddingService } from '../embeddings';
import type { ElasticsearchClient } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeLogger = () => loggerMock.create();

const makeEmbeddingService = (
  available: boolean,
  embedding: number[] = [0.1, 0.2, 0.3]
): EmbeddingService =>
  ({
    embed: jest.fn().mockResolvedValue(embedding),
    batchEmbed: jest.fn().mockResolvedValue([embedding]),
    isAvailable: jest.fn().mockReturnValue(available),
  }) as unknown as EmbeddingService;

const makeEsClient = (score: number | null): ElasticsearchClient => ({
  search: jest.fn().mockResolvedValue({
    hits: {
      hits: score !== null
        ? [
            {
              _id: 'existing-mem-001',
              _source: {
                type: 'semantic',
                summary: 'Existing memory',
                full: 'Existing memory full content',
                confidence: 0.8,
                salience: 0.5,
                recency: new Date().toISOString(),
                utility: 0.5,
                stability: 0.5,
                access_count: 5,
                reinforcement_score: 0.4,
                status: 'established',
                source_refs: [],
                links: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                space: 'default',
                user_name: 'user1',
              },
              _score: score,
            },
          ]
        : [],
    },
  }),
} as unknown as ElasticsearchClient);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DedupChecker', () => {
  describe('when embedding service is not available', () => {
    it('returns fresh disposition regardless of score', async () => {
      const checker = new DedupChecker({
        esClient: makeEsClient(0.99),
        embeddingService: makeEmbeddingService(false),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('User prefers TypeScript');
      expect(result.disposition).toBe('fresh');
      expect(result.closestMatch).toBeUndefined();
    });
  });

  describe('when embedding service is available', () => {
    it('returns skip when similarity exceeds NEAR_DUPLICATE_THRESHOLD', async () => {
      // Score at exactly 0.92 triggers skip
      const checker = new DedupChecker({
        esClient: makeEsClient(NEAR_DUPLICATE_THRESHOLD),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('User prefers TypeScript');
      expect(result.disposition).toBe('skip');
      expect(result.closestMatch).toBeDefined();
      expect(result.similarityScore).toBeGreaterThanOrEqual(NEAR_DUPLICATE_THRESHOLD);
    });

    it('returns skip when similarity is above NEAR_DUPLICATE_THRESHOLD', async () => {
      const checker = new DedupChecker({
        esClient: makeEsClient(0.95),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('User prefers TypeScript');
      expect(result.disposition).toBe('skip');
    });

    it('returns derived when similarity is in [RELATED_THRESHOLD, NEAR_DUPLICATE_THRESHOLD)', async () => {
      // Score in the range [0.8, 0.92)
      const checker = new DedupChecker({
        esClient: makeEsClient(0.85),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('User prefers TypeScript slightly different');
      expect(result.disposition).toBe('derived');
      expect(result.closestMatch).toBeDefined();
      expect(result.similarityScore).toBeGreaterThanOrEqual(RELATED_THRESHOLD);
      expect(result.similarityScore).toBeLessThan(NEAR_DUPLICATE_THRESHOLD);
    });

    it('returns fresh when similarity is below RELATED_THRESHOLD', async () => {
      const checker = new DedupChecker({
        esClient: makeEsClient(0.5),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('Completely different memory');
      expect(result.disposition).toBe('fresh');
    });

    it('returns fresh when no existing memories are found', async () => {
      const checker = new DedupChecker({
        esClient: makeEsClient(null),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('Brand new memory');
      expect(result.disposition).toBe('fresh');
    });

    it('returns fresh when embedding returns empty array', async () => {
      const checker = new DedupChecker({
        esClient: makeEsClient(0.99),
        embeddingService: makeEmbeddingService(true, []),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('Test memory');
      expect(result.disposition).toBe('fresh');
    });

    it('returns fresh when kNN search throws (non-fatal)', async () => {
      const failingEsClient = {
        search: jest.fn().mockRejectedValue(new Error('kNN not available')),
      } as unknown as ElasticsearchClient;

      const checker = new DedupChecker({
        esClient: failingEsClient,
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('Test memory');
      expect(result.disposition).toBe('fresh');
    });

    it('clamps similarity score to [0, 1]', async () => {
      // ES can return scores > 1 in some cases
      const checker = new DedupChecker({
        esClient: makeEsClient(1.2),
        embeddingService: makeEmbeddingService(true),
        space: 'default',
        userName: 'user1',
        logger: makeLogger(),
      });

      const result = await checker.check('Test memory');
      expect(result.similarityScore).toBeLessThanOrEqual(1.0);
      expect(result.disposition).toBe('skip');
    });
  });

  describe('threshold constants', () => {
    it('NEAR_DUPLICATE_THRESHOLD is 0.92', () => {
      expect(NEAR_DUPLICATE_THRESHOLD).toBe(0.92);
    });

    it('RELATED_THRESHOLD is 0.8', () => {
      expect(RELATED_THRESHOLD).toBe(0.8);
    });

    it('NEAR_DUPLICATE_THRESHOLD > RELATED_THRESHOLD', () => {
      expect(NEAR_DUPLICATE_THRESHOLD).toBeGreaterThan(RELATED_THRESHOLD);
    });
  });
});
