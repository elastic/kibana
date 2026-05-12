/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  RULE_DOCTOR_INSIGHTS_INDEX,
  type RuleDoctorInsightDoc,
} from '../../resources/indices/rule_doctor_insights';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { RuleDoctorInsightsClient } from './rule_doctor_insights_client';

const mockLoggerService: jest.Mocked<LoggerServiceContract> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const makeInsight = (overrides: Partial<RuleDoctorInsightDoc> = {}): RuleDoctorInsightDoc => ({
  '@timestamp': '2026-04-23T00:00:00.000Z',
  insight_id: 'insight-1',
  execution_id: 'exec-1',
  status: 'open',
  type: 'deduplication',
  action: 'merge',
  impact: 'high',
  confidence: 'high',
  title: 'Duplicate rules detected',
  summary: 'Rules A and B are duplicates',
  justification: '',
  rule_ids: ['rule-1', 'rule-2'],
  data: {},
  current: null,
  proposed: null,
  space_id: 'default',
  ...overrides,
});

describe('RuleDoctorInsightsClient', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  let client: RuleDoctorInsightsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    client = new RuleDoctorInsightsClient(esClient, mockLoggerService);
  });

  describe('listInsights', () => {
    it('builds query with space_id filter and default pagination', async () => {
      esClient.search.mockResolvedValue({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      await client.listInsights({ spaceId: 'default' });

      expect(esClient.search).toHaveBeenCalledWith({
        index: RULE_DOCTOR_INSIGHTS_INDEX,
        ignore_unavailable: true,
        query: { bool: { filter: [{ term: { space_id: 'default' } }] } },
        sort: [{ '@timestamp': { order: 'desc' } }],
        from: 0,
        size: 20,
        track_total_hits: true,
      });
    });

    it('includes optional filters when provided', async () => {
      esClient.search.mockResolvedValue({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      await client.listInsights({
        spaceId: 'my-space',
        status: 'open',
        type: 'deduplication',
        executionId: 'exec-1',
        ruleIds: ['rule-1'],
        from: 10,
        size: 5,
      });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { space_id: 'my-space' } },
                { term: { status: 'open' } },
                { term: { type: 'deduplication' } },
                { term: { execution_id: 'exec-1' } },
                { terms: { rule_ids: ['rule-1'] } },
              ],
            },
          },
          from: 10,
          size: 5,
        })
      );
    });

    it('returns items and total from response', async () => {
      const insight = makeInsight();
      esClient.search.mockResolvedValue({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_INSIGHTS_INDEX, _source: insight }],
        },
      } as never);

      const result = await client.listInsights({ spaceId: 'default' });

      expect(result).toEqual({ items: [insight], total: 1 });
    });

    it('returns empty results when index does not exist', async () => {
      esClient.search.mockResolvedValue({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      const result = await client.listInsights({ spaceId: 'default' });

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('getInsight', () => {
    it('returns insight when found in the correct space', async () => {
      const insight = makeInsight();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_INSIGHTS_INDEX, _source: insight }],
        },
      } as never);

      const result = await client.getInsight('insight-1', 'default');

      expect(result).toEqual(insight);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ term: { insight_id: 'insight-1' } }, { term: { space_id: 'default' } }],
            },
          },
          size: 1,
        })
      );
    });

    it('throws 404 when insight does not exist', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      await expect(client.getInsight('missing', 'default')).rejects.toThrow(
        /Insight missing not found/
      );
    });
  });

  describe('updateInsightStatus', () => {
    it('looks up by insight_id + space_id and updates the ES document', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_INSIGHTS_INDEX }] },
      } as never);
      esClient.update.mockResolvedValue({ result: 'updated' } as never);

      await client.updateInsightStatus('insight-1', 'dismissed', 'default');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [{ term: { insight_id: 'insight-1' } }, { term: { space_id: 'default' } }],
            },
          },
          size: 1,
          _source: false,
        })
      );
      expect(esClient.update).toHaveBeenCalledWith({
        index: RULE_DOCTOR_INSIGHTS_INDEX,
        id: 'doc-1',
        doc: { status: 'dismissed' },
        refresh: 'wait_for',
      });
    });

    it('throws 404 when insight does not exist in the space', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      await expect(client.updateInsightStatus('missing', 'dismissed', 'default')).rejects.toThrow(
        /Insight missing not found/
      );

      expect(esClient.update).not.toHaveBeenCalled();
    });
  });

  describe('bulkIndexInsights', () => {
    it('returns early for empty array', async () => {
      const result = await client.bulkIndexInsights([]);

      expect(result).toEqual({ indexed: 0, failed: 0 });
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('builds bulk operations with space_id:insight_id as _id', async () => {
      const insight = makeInsight();
      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'default:insight-1', status: 201 } }],
      } as never);

      const result = await client.bulkIndexInsights([insight]);

      expect(esClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: RULE_DOCTOR_INSIGHTS_INDEX, _id: 'default:insight-1' } },
          insight,
        ],
        refresh: false,
      });
      expect(result).toEqual({ indexed: 1, failed: 0 });
    });

    it('reports failed count and logs error when bulk has errors', async () => {
      const insights = [makeInsight(), makeInsight({ insight_id: 'insight-2' })];
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'insight-1', status: 201 } },
          {
            index: {
              _id: 'insight-2',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      } as never);

      const result = await client.bulkIndexInsights(insights);

      expect(result).toEqual({ indexed: 1, failed: 1 });
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'BULK_INDEX_INSIGHTS_ERROR',
        })
      );
    });
  });
});
