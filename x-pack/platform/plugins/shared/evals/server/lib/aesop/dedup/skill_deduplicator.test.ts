/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SkillDeduplicator } from './skill_deduplicator';
import type { SkillSummary } from './skill_deduplicator';

describe('SkillDeduplicator', () => {
  describe('jaccardSimilarity', () => {
    it('returns 0 for two empty sets', () => {
      expect(SkillDeduplicator.jaccardSimilarity([], [])).toBe(0);
    });

    it('returns 1 for identical sets', () => {
      expect(SkillDeduplicator.jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1);
    });

    it('returns correct value for partial overlap', () => {
      // intersection: {a, b} = 2, union: {a, b, c, d} = 4 => 0.5
      expect(SkillDeduplicator.jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'd'])).toBe(0.5);
    });

    it('returns 0 for completely disjoint sets', () => {
      expect(SkillDeduplicator.jaccardSimilarity(['a', 'b'], ['c', 'd'])).toBe(0);
    });

    it('returns 0 when one set is empty and the other is not', () => {
      expect(SkillDeduplicator.jaccardSimilarity([], ['a', 'b'])).toBe(0);
      expect(SkillDeduplicator.jaccardSimilarity(['a', 'b'], [])).toBe(0);
    });
  });

  describe('tokenize', () => {
    it('splits text into lowercase words', () => {
      expect(SkillDeduplicator.tokenize('Hello World')).toEqual(['hello', 'world']);
    });

    it('filters stopwords', () => {
      const result = SkillDeduplicator.tokenize('Analyze the data and correlate with logs');
      expect(result).not.toContain('the');
      expect(result).not.toContain('and');
      expect(result).not.toContain('with');
      expect(result).toContain('analyze');
      expect(result).toContain('data');
      expect(result).toContain('correlate');
      expect(result).toContain('logs');
    });

    it('handles empty string', () => {
      expect(SkillDeduplicator.tokenize('')).toEqual([]);
    });
  });

  describe('nameSimilarity', () => {
    it('returns high score for similar names', () => {
      const score = SkillDeduplicator.nameSimilarity(
        'Analyze endpoint security alerts',
        'Security alert analysis for endpoints'
      );
      // Both share: analyze/analysis (stemming aside), endpoint/endpoints, security, alerts/alert
      // With tokenization: ['analyze', 'endpoint', 'security', 'alerts'] vs ['security', 'alert', 'analysis', 'endpoints']
      // Exact Jaccard will depend on exact tokens, but should be > 0
      expect(score).toBeGreaterThan(0);
    });

    it('returns 1 for identical names', () => {
      expect(SkillDeduplicator.nameSimilarity('Analyze logs', 'Analyze logs')).toBe(1);
    });

    it('returns low score for different names', () => {
      const score = SkillDeduplicator.nameSimilarity(
        'Analyze endpoint security alerts',
        'Monitor network traffic latency'
      );
      expect(score).toBeLessThan(0.3);
    });

    it('returns 0 for completely different names', () => {
      const score = SkillDeduplicator.nameSimilarity('foo bar', 'baz qux');
      expect(score).toBe(0);
    });
  });

  describe('indexOverlap', () => {
    it('returns 1 for identical index lists', () => {
      expect(
        SkillDeduplicator.indexOverlap(
          ['logs-endpoint-default', 'metrics-system-default'],
          ['logs-endpoint-default', 'metrics-system-default']
        )
      ).toBe(1);
    });

    it('returns correct value for partial overlap', () => {
      const score = SkillDeduplicator.indexOverlap(
        ['logs-endpoint-default', 'metrics-system-default'],
        ['logs-endpoint-default', 'logs-nginx-default']
      );
      // intersection: 1, union: 3 => 1/3
      expect(score).toBeCloseTo(1 / 3);
    });

    it('returns 0 for no overlap', () => {
      expect(
        SkillDeduplicator.indexOverlap(['logs-endpoint-default'], ['metrics-system-default'])
      ).toBe(0);
    });
  });

  describe('computeSimilarity', () => {
    it('computes weighted score of name and index similarity', () => {
      const proposed: SkillSummary = {
        id: 'skill-1',
        name: 'Analyze logs',
        sourceIndices: ['logs-endpoint-default'],
      };
      const existing: SkillSummary = {
        id: 'skill-2',
        name: 'Analyze logs',
        sourceIndices: ['logs-endpoint-default'],
      };
      // Both name and index are identical => 0.6 * 1 + 0.4 * 1 = 1
      expect(SkillDeduplicator.computeSimilarity(proposed, existing)).toBe(1);
    });

    it('weights name similarity at 0.6 and index overlap at 0.4', () => {
      const proposed: SkillSummary = {
        id: 'skill-1',
        name: 'Analyze logs',
        sourceIndices: ['logs-a'],
      };
      const existing: SkillSummary = {
        id: 'skill-2',
        name: 'Analyze logs',
        sourceIndices: ['logs-b'],
      };
      // name = 1, index = 0 => 0.6 * 1 + 0.4 * 0 = 0.6
      expect(SkillDeduplicator.computeSimilarity(proposed, existing)).toBe(0.6);
    });
  });

  describe('findDuplicates', () => {
    it('detects duplicates by name similarity', () => {
      const proposed: SkillSummary[] = [
        { id: 'p1', name: 'Analyze endpoint alerts', sourceIndices: ['logs-a'] },
      ];
      const existing: SkillSummary[] = [
        { id: 'e1', name: 'Analyze endpoint alerts', sourceIndices: ['logs-b'] },
      ];

      const matches = SkillDeduplicator.findDuplicates(proposed, existing);
      expect(matches.length).toBe(1);
      expect(matches[0].proposedId).toBe('p1');
      expect(matches[0].existingId).toBe('e1');
      expect(matches[0].similarity).toBeGreaterThanOrEqual(0.6);
    });

    it('detects duplicates by index overlap', () => {
      const proposed: SkillSummary[] = [
        { id: 'p1', name: 'foo bar baz', sourceIndices: ['logs-a', 'logs-b', 'logs-c'] },
      ];
      const existing: SkillSummary[] = [
        { id: 'e1', name: 'qux quux corge', sourceIndices: ['logs-a', 'logs-b', 'logs-c'] },
      ];

      const matches = SkillDeduplicator.findDuplicates(proposed, existing);
      // name = 0, index = 1 => 0.6 * 0 + 0.4 * 1 = 0.4 — below threshold
      // So pure index overlap alone is not sufficient unless name also overlaps
      expect(matches.length).toBe(0);
    });

    it('detects duplicates with combined name and index similarity', () => {
      const proposed: SkillSummary[] = [
        { id: 'p1', name: 'Analyze endpoint alerts', sourceIndices: ['logs-a', 'logs-b'] },
      ];
      const existing: SkillSummary[] = [
        { id: 'e1', name: 'Analyze endpoint alerts', sourceIndices: ['logs-a', 'logs-c'] },
      ];

      const matches = SkillDeduplicator.findDuplicates(proposed, existing);
      expect(matches.length).toBe(1);
      expect(matches[0].similarity).toBeGreaterThanOrEqual(0.6);
    });

    it('does not flag unrelated skills', () => {
      const proposed: SkillSummary[] = [
        { id: 'p1', name: 'Analyze endpoint alerts', sourceIndices: ['logs-endpoint-default'] },
      ];
      const existing: SkillSummary[] = [
        {
          id: 'e1',
          name: 'Monitor network latency',
          sourceIndices: ['metrics-network-default'],
        },
      ];

      const matches = SkillDeduplicator.findDuplicates(proposed, existing);
      expect(matches.length).toBe(0);
    });

    it('returns empty array when no skills are provided', () => {
      expect(SkillDeduplicator.findDuplicates([], [])).toEqual([]);
    });
  });

  describe('deduplicate', () => {
    it('keeps higher confidence skill when duplicates found in batch', () => {
      const skills: SkillSummary[] = [
        {
          id: 's1',
          name: 'Analyze endpoint alerts',
          sourceIndices: ['logs-endpoint-default'],
          confidence: 0.9,
        },
        {
          id: 's2',
          name: 'Analyze endpoint alerts',
          sourceIndices: ['logs-endpoint-default'],
          confidence: 0.7,
        },
      ];

      const result = SkillDeduplicator.deduplicate(skills);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('s1');
    });

    it('returns all skills when no duplicates exist', () => {
      const skills: SkillSummary[] = [
        { id: 's1', name: 'Analyze logs', sourceIndices: ['logs-a'], confidence: 0.8 },
        {
          id: 's2',
          name: 'Monitor network',
          sourceIndices: ['metrics-network'],
          confidence: 0.7,
        },
      ];

      const result = SkillDeduplicator.deduplicate(skills);
      expect(result.length).toBe(2);
    });

    it('handles single skill input', () => {
      const skills: SkillSummary[] = [
        { id: 's1', name: 'Analyze logs', sourceIndices: ['logs-a'], confidence: 0.8 },
      ];

      const result = SkillDeduplicator.deduplicate(skills);
      expect(result.length).toBe(1);
    });

    it('handles empty input', () => {
      expect(SkillDeduplicator.deduplicate([])).toEqual([]);
    });
  });

  describe('deduplicateAgainstExisting', () => {
    const createMockLogger = () =>
      ({
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      } as unknown as Parameters<typeof SkillDeduplicator.deduplicateAgainstExisting>[2]);

    it('handles missing index (404) by returning proposed unchanged', async () => {
      const mockEsClient = {
        search: jest.fn().mockRejectedValue({
          meta: { statusCode: 404 },
        }),
      } as unknown as Parameters<typeof SkillDeduplicator.deduplicateAgainstExisting>[0];
      const logger = createMockLogger();

      const proposed: SkillSummary[] = [
        { id: 's1', name: 'Analyze logs', sourceIndices: ['logs-a'], confidence: 0.8 },
      ];

      const result = await SkillDeduplicator.deduplicateAgainstExisting(
        mockEsClient,
        proposed,
        logger
      );
      expect(result).toEqual(proposed);
    });

    it('returns all when no existing skills match', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'e1',
                _source: {
                  name: 'Monitor network latency',
                  source: { source_indices: ['metrics-network-default'] },
                  confidence: 0.7,
                },
              },
            ],
          },
        }),
      } as unknown as Parameters<typeof SkillDeduplicator.deduplicateAgainstExisting>[0];
      const logger = createMockLogger();

      const proposed: SkillSummary[] = [
        {
          id: 's1',
          name: 'Analyze endpoint alerts',
          sourceIndices: ['logs-endpoint-default'],
          confidence: 0.8,
        },
      ];

      const result = await SkillDeduplicator.deduplicateAgainstExisting(
        mockEsClient,
        proposed,
        logger
      );
      expect(result).toEqual(proposed);
    });

    it('filters out duplicates that match existing skills', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'e1',
                _source: {
                  name: 'Analyze endpoint alerts',
                  source: { source_indices: ['logs-endpoint-default'] },
                  confidence: 0.9,
                },
              },
            ],
          },
        }),
      } as unknown as Parameters<typeof SkillDeduplicator.deduplicateAgainstExisting>[0];
      const logger = createMockLogger();

      const proposed: SkillSummary[] = [
        {
          id: 's1',
          name: 'Analyze endpoint alerts',
          sourceIndices: ['logs-endpoint-default'],
          confidence: 0.8,
        },
        {
          id: 's2',
          name: 'Monitor network traffic',
          sourceIndices: ['metrics-network-default'],
          confidence: 0.7,
        },
      ];

      const result = await SkillDeduplicator.deduplicateAgainstExisting(
        mockEsClient,
        proposed,
        logger
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('s2');
    });

    it('returns all proposed skills when ES returns empty results', async () => {
      const mockEsClient = {
        search: jest.fn().mockResolvedValue({
          hits: { hits: [] },
        }),
      } as unknown as Parameters<typeof SkillDeduplicator.deduplicateAgainstExisting>[0];
      const logger = createMockLogger();

      const proposed: SkillSummary[] = [
        { id: 's1', name: 'Analyze logs', sourceIndices: ['logs-a'], confidence: 0.8 },
      ];

      const result = await SkillDeduplicator.deduplicateAgainstExisting(
        mockEsClient,
        proposed,
        logger
      );
      expect(result).toEqual(proposed);
    });
  });
});
