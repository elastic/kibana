/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeAndWriteScores,
  getDashboardStats,
  getScoreTrend,
  findComplianceFindings,
} from '../services/compliance_scoring_service';

const createMockEsClient = () => ({
  search: jest.fn(),
  bulk: jest.fn().mockResolvedValue({ errors: false }),
});

const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('ComplianceScoringService', () => {
  let esClient: ReturnType<typeof createMockEsClient>;
  let logger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    esClient = createMockEsClient();
    logger = createMockLogger();
  });

  describe('computeAndWriteScores', () => {
    it('computes scores for each benchmark and writes to data stream', async () => {
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          benchmarks: {
            buckets: [
              {
                key: 'cis_macos',
                doc_count: 100,
                benchmark_name: { buckets: [{ key: 'CIS macOS' }] },
                benchmark_version: { buckets: [{ key: 'v1.0.0' }] },
                passed: { doc_count: 80 },
                failed: { doc_count: 15 },
                not_applicable: { doc_count: 5 },
                hosts: { value: 3 },
              },
            ],
          },
        },
      });

      await computeAndWriteScores(esClient as any, {}, 'default', logger as any);

      expect(esClient.bulk).toHaveBeenCalled();
      const bulkBody = esClient.bulk.mock.calls[0][0].body;
      const scoreDoc = bulkBody[1];
      expect(scoreDoc.passed_findings).toBe(80);
      expect(scoreDoc.failed_findings).toBe(15);
      expect(scoreDoc.not_applicable_findings).toBe(5);
      expect(scoreDoc.total_findings).toBe(100);
      expect(scoreDoc.host_count).toBe(3);
    });

    it('handles no benchmarks gracefully', async () => {
      esClient.search.mockResolvedValueOnce({ aggregations: { benchmarks: { buckets: [] } } });
      await computeAndWriteScores(esClient as any, {}, 'default', logger as any);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('logs error on search failure', async () => {
      esClient.search.mockRejectedValueOnce(new Error('index_not_found'));
      await computeAndWriteScores(esClient as any, {}, 'default', logger as any);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('index_not_found'));
    });
  });

  describe('getDashboardStats', () => {
    it('returns dashboard stats with not_applicable count', async () => {
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          passed: { doc_count: 50 },
          failed: { doc_count: 10 },
          not_applicable: { doc_count: 5 },
          hosts: { value: 2 },
          sections: { buckets: [] },
          worst_hosts: { buckets: [] },
        },
      });

      const stats = await getDashboardStats(esClient as any, 'cis_macos', {});
      expect(stats.passed_findings).toBe(50);
      expect(stats.failed_findings).toBe(10);
      expect(stats.not_applicable_findings).toBe(5);
      expect(stats.total_findings).toBe(65);
      expect(stats.host_count).toBe(2);
    });
  });

  describe('getScoreTrend', () => {
    it('returns trend data points', async () => {
      esClient.search.mockResolvedValueOnce({
        aggregations: {
          trend: {
            buckets: [
              { key_as_string: '2024-01-01T00:00:00Z', avg_score: { value: 85 } },
              { key_as_string: '2024-01-01T01:00:00Z', avg_score: { value: 87 } },
            ],
          },
        },
      });

      const trend = await getScoreTrend(esClient as any, 'cis_macos', '24h');
      expect(trend).toHaveLength(2);
      expect(trend[0].score).toBe(85);
      expect(trend[1].timestamp).toBe('2024-01-01T01:00:00Z');
    });
  });

  describe('findComplianceFindings', () => {
    it('returns paginated findings', async () => {
      esClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 1 },
          hits: [
            { _id: 'f1', _source: { result: { evaluation: 'passed' }, rule: { name: 'Test' } } },
          ],
        },
      });

      const result = await findComplianceFindings(esClient as any, { page: 1, perPage: 20 });
      expect(result.total).toBe(1);
      expect(result.findings[0].id).toBe('f1');
    });

    it('applies filters correctly', async () => {
      esClient.search.mockResolvedValueOnce({ hits: { total: { value: 0 }, hits: [] } });

      await findComplianceFindings(esClient as any, {
        benchmarkId: 'cis_macos',
        evaluation: 'failed',
      });
      const searchBody = esClient.search.mock.calls[0][0];
      expect(searchBody.query.bool.must).toHaveLength(2);
    });
  });
});
