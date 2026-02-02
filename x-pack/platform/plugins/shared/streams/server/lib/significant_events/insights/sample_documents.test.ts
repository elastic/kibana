/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';
import {
  fetchSampleDocuments,
  fetchAlertSampleDocuments,
  ALERTS_INDEX_CONFIG,
} from './sample_documents';
import { SecurityError } from '../../streams/errors/security_error';

describe('sample_documents', () => {
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  describe('fetchSampleDocuments', () => {
    const defaultOptions = {
      index: 'test-index',
      from: new Date('2024-01-01T00:00:00Z'),
      to: new Date('2024-01-02T00:00:00Z'),
    };

    it('returns documents and total count from search results', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 100, relation: 'eq' },
          hits: [
            { _index: 'test-index', _id: '1', _source: { field1: 'value1', message: 'test1' } },
            { _index: 'test-index', _id: '2', _source: { field1: 'value2', message: 'test2' } },
          ],
        },
      });

      const result = await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(result.totalCount).toBe(100);
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0]).toEqual({ field1: 'value1', message: 'test1' });
      expect(result.documents[1]).toEqual({ field1: 'value2', message: 'test2' });
    });

    it('uses default sample size of 5', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 5,
        })
      );
    });

    it('respects custom sample size', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments({ ...defaultOptions, size: 10 }, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
        })
      );
    });

    it('uses latest strategy with timestamp sort by default', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: '2024-01-01T00:00:00.000Z',
                      lte: '2024-01-02T00:00:00.000Z',
                    },
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('uses random strategy with function_score query', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments({ ...defaultOptions, strategy: 'random' }, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            function_score: {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        '@timestamp': {
                          gte: '2024-01-01T00:00:00.000Z',
                          lte: '2024-01-02T00:00:00.000Z',
                        },
                      },
                    },
                  ],
                },
              },
              functions: [{ random_score: {} }],
              boost_mode: 'replace',
            },
          },
        })
      );
      // Random strategy should not have sort
      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: undefined,
        })
      );
    });

    it('uses custom timestamp field', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(
        { ...defaultOptions, timestampField: 'event.timestamp' },
        esClientMock
      );

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ 'event.timestamp': 'desc' }],
          query: {
            bool: {
              filter: [
                {
                  range: {
                    'event.timestamp': {
                      gte: '2024-01-01T00:00:00.000Z',
                      lte: '2024-01-02T00:00:00.000Z',
                    },
                  },
                },
              ],
            },
          },
        })
      );
    });

    it('includes additional filters in query', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(
        {
          ...defaultOptions,
          additionalFilters: [{ term: { 'rule.id': 'rule-123' } }, { term: { status: 'active' } }],
        },
        esClientMock
      );

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                expect.objectContaining({ range: expect.any(Object) }),
                { term: { 'rule.id': 'rule-123' } },
                { term: { status: 'active' } },
              ],
            },
          },
        })
      );
    });

    it('extracts originalSourceField when specified', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            {
              _index: 'alerts-index',
              _id: '1',
              _source: {
                'kibana.alert.rule.uuid': 'rule-1',
                original_source: { message: 'original1', host: 'host1' },
              },
            },
            {
              _index: 'alerts-index',
              _id: '2',
              _source: {
                'kibana.alert.rule.uuid': 'rule-1',
                original_source: { message: 'original2', host: 'host2' },
              },
            },
          ],
        },
      });

      const result = await fetchSampleDocuments(
        { ...defaultOptions, originalSourceField: 'original_source' },
        esClientMock
      );

      expect(result.documents).toEqual([
        { message: 'original1', host: 'host1' },
        { message: 'original2', host: 'host2' },
      ]);
    });

    it('handles missing originalSourceField gracefully', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: 'alerts-index',
              _id: '1',
              _source: {
                'kibana.alert.rule.uuid': 'rule-1',
                // no original_source field
              },
            },
          ],
        },
      });

      const result = await fetchSampleDocuments(
        { ...defaultOptions, originalSourceField: 'original_source' },
        esClientMock
      );

      expect(result.documents).toEqual([{}]);
    });

    it('omits _id field by default', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: 'test-index',
              _id: '1',
              _source: { field1: 'value1', _id: 'source-id' },
            },
          ],
        },
      });

      const result = await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(result.documents[0]).toEqual({ field1: 'value1' });
      expect(result.documents[0]).not.toHaveProperty('_id');
    });

    it('respects custom omitFields', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: 'test-index',
              _id: '1',
              _source: { field1: 'value1', secret: 'sensitive', _id: 'id' },
            },
          ],
        },
      });

      const result = await fetchSampleDocuments(
        { ...defaultOptions, omitFields: ['_id', 'secret'] },
        esClientMock
      );

      expect(result.documents[0]).toEqual({ field1: 'value1' });
    });

    it('handles numeric total hits format', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: 42,
          hits: [],
        },
      });

      const result = await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(result.totalCount).toBe(42);
    });

    it('handles missing total hits', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
        },
      });

      const result = await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(result.totalCount).toBe(0);
    });

    it('throws SecurityError on security exception', async () => {
      const securityError = new errors.ResponseError({
        body: {
          error: {
            type: 'security_exception',
            reason: 'missing index privileges',
          },
        },
        statusCode: 403,
        headers: {},
        warnings: [],
        meta: {} as any,
      });

      esClientMock.search.mockRejectedValue(securityError);

      await expect(fetchSampleDocuments(defaultOptions, esClientMock)).rejects.toThrow(
        SecurityError
      );
      await expect(fetchSampleDocuments(defaultOptions, esClientMock)).rejects.toThrow(
        /Cannot read sample documents, insufficient privileges/
      );
    });

    it('rethrows non-security errors', async () => {
      const genericError = new Error('Connection timeout');
      esClientMock.search.mockRejectedValue(genericError);

      await expect(fetchSampleDocuments(defaultOptions, esClientMock)).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('passes sourceFields to search when specified', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(
        { ...defaultOptions, sourceFields: ['message', 'host.name'] },
        esClientMock
      );

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: ['message', 'host.name'],
        })
      );
    });

    it('tracks total hits', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchSampleDocuments(defaultOptions, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          track_total_hits: true,
        })
      );
    });
  });

  describe('fetchAlertSampleDocuments', () => {
    const ruleId = 'test-rule-uuid';
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date('2024-01-02T00:00:00Z');

    it('uses alerts index configuration', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchAlertSampleDocuments(ruleId, from, to, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ALERTS_INDEX_CONFIG.index,
        })
      );
    });

    it('filters by rule UUID', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchAlertSampleDocuments(ruleId, from, to, esClientMock);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                expect.objectContaining({ range: expect.any(Object) }),
                { term: { 'kibana.alert.rule.uuid': 'test-rule-uuid' } },
              ],
            },
          },
        })
      );
    });

    it('extracts original_source from alerts', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [
            {
              _index: '.alerts-streams.alerts-default',
              _id: '1',
              _source: {
                'kibana.alert.rule.uuid': ruleId,
                original_source: { message: 'alert document', severity: 'high' },
              },
            },
          ],
        },
      });

      const result = await fetchAlertSampleDocuments(ruleId, from, to, esClientMock);

      expect(result.documents).toEqual([{ message: 'alert document', severity: 'high' }]);
    });

    it('respects custom size option', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchAlertSampleDocuments(ruleId, from, to, esClientMock, { size: 10 });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 10,
        })
      );
    });

    it('respects custom strategy option', async () => {
      esClientMock.search.mockResolvedValue({
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      });

      await fetchAlertSampleDocuments(ruleId, from, to, esClientMock, { strategy: 'random' });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            function_score: expect.objectContaining({
              functions: [{ random_score: {} }],
            }),
          },
        })
      );
    });
  });

  describe('ALERTS_INDEX_CONFIG', () => {
    it('has correct alerts index name', () => {
      expect(ALERTS_INDEX_CONFIG.index).toBe('.alerts-streams.alerts-default');
    });

    it('has correct original source field', () => {
      expect(ALERTS_INDEX_CONFIG.originalSourceField).toBe('original_source');
    });

    it('omits _id by default', () => {
      expect(ALERTS_INDEX_CONFIG.omitFields).toContain('_id');
    });
  });
});
