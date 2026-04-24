/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';

import { RULE_DOCTOR_FINDINGS_INDEX } from '../../resources/indices/rule_doctor_findings';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { RuleDoctorFindingsClient } from './rule_doctor_findings_client';
import type { RuleDoctorFindingDoc } from '../../resources/indices/rule_doctor_findings';

const mockLoggerService: jest.Mocked<LoggerServiceContract> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const makeFinding = (overrides: Partial<RuleDoctorFindingDoc> = {}): RuleDoctorFindingDoc => ({
  '@timestamp': '2026-04-23T00:00:00.000Z',
  finding_id: 'finding-1',
  execution_id: 'exec-1',
  status: 'open',
  type: 'deduplication',
  action: 'merge',
  impact: 'high',
  confidence: 'high',
  title: 'Duplicate rules detected',
  summary: 'Rules A and B are duplicates',
  rule_ids: ['rule-1', 'rule-2'],
  data: {},
  current: null,
  proposed: null,
  space_id: 'default',
  ...overrides,
});

describe('RuleDoctorFindingsClient', () => {
  let esClient: DeeplyMockedApi<ElasticsearchClient>;
  let client: RuleDoctorFindingsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    client = new RuleDoctorFindingsClient(esClient, mockLoggerService);
  });

  describe('listFindings', () => {
    it('builds query with space_id filter and default pagination', async () => {
      esClient.search.mockResolvedValue({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      await client.listFindings({ spaceId: 'default' });

      expect(esClient.search).toHaveBeenCalledWith({
        index: RULE_DOCTOR_FINDINGS_INDEX,
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

      await client.listFindings({
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
      const finding = makeFinding();
      esClient.search.mockResolvedValue({
        hits: {
          total: { value: 1, relation: 'eq' },
          hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_FINDINGS_INDEX, _source: finding }],
        },
      } as never);

      const result = await client.listFindings({ spaceId: 'default' });

      expect(result).toEqual({ items: [finding], total: 1 });
    });

    it('returns empty results when index does not exist', async () => {
      esClient.search.mockResolvedValue({
        hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      } as never);

      const result = await client.listFindings({ spaceId: 'default' });

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('getFinding', () => {
    it('returns finding when found in the correct space', async () => {
      const finding = makeFinding();
      esClient.search.mockResolvedValue({
        hits: {
          hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_FINDINGS_INDEX, _source: finding }],
        },
      } as never);

      const result = await client.getFinding('finding-1', 'default');

      expect(result).toEqual(finding);
      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { finding_id: 'finding-1' } },
                { term: { space_id: 'default' } },
              ],
            },
          },
          size: 1,
        })
      );
    });

    it('throws 404 when finding does not exist', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      await expect(client.getFinding('missing', 'default')).rejects.toThrow(
        /Finding missing not found/
      );
    });
  });

  describe('updateFindingStatus', () => {
    it('looks up by finding_id + space_id and updates the ES document', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [{ _id: 'doc-1', _index: RULE_DOCTOR_FINDINGS_INDEX }] },
      } as never);
      esClient.update.mockResolvedValue({ result: 'updated' } as never);

      await client.updateFindingStatus('finding-1', 'dismissed', 'default');

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            bool: {
              filter: [
                { term: { finding_id: 'finding-1' } },
                { term: { space_id: 'default' } },
              ],
            },
          },
          size: 1,
          _source: false,
        })
      );
      expect(esClient.update).toHaveBeenCalledWith({
        index: RULE_DOCTOR_FINDINGS_INDEX,
        id: 'doc-1',
        doc: { status: 'dismissed' },
        refresh: 'wait_for',
      });
    });

    it('throws 404 when finding does not exist in the space', async () => {
      esClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as never);

      await expect(
        client.updateFindingStatus('missing', 'dismissed', 'default')
      ).rejects.toThrow(/Finding missing not found/);

      expect(esClient.update).not.toHaveBeenCalled();
    });
  });

  describe('bulkIndexFindings', () => {
    it('returns early for empty array', async () => {
      const result = await client.bulkIndexFindings([]);

      expect(result).toEqual({ indexed: 0, failed: 0 });
      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('builds bulk operations with finding_id as _id', async () => {
      const finding = makeFinding();
      esClient.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'finding-1', status: 201 } }],
      } as never);

      const result = await client.bulkIndexFindings([finding]);

      expect(esClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: RULE_DOCTOR_FINDINGS_INDEX, _id: 'finding-1' } },
          finding,
        ],
        refresh: false,
      });
      expect(result).toEqual({ indexed: 1, failed: 0 });
    });

    it('reports failed count and logs error when bulk has errors', async () => {
      const findings = [makeFinding(), makeFinding({ finding_id: 'finding-2' })];
      esClient.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'finding-1', status: 201 } },
          {
            index: {
              _id: 'finding-2',
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      } as never);

      const result = await client.bulkIndexFindings(findings);

      expect(result).toEqual({ indexed: 1, failed: 1 });
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'BULK_INDEX_FINDINGS_ERROR',
        })
      );
    });
  });

  describe('countFindings', () => {
    it('builds query with space_id and optional filters', async () => {
      esClient.count.mockResolvedValue({ count: 42 } as never);

      const result = await client.countFindings({
        spaceId: 'default',
        status: 'open',
        type: 'stale_rule',
      });

      expect(esClient.count).toHaveBeenCalledWith({
        index: RULE_DOCTOR_FINDINGS_INDEX,
        ignore_unavailable: true,
        query: {
          bool: {
            filter: [
              { term: { space_id: 'default' } },
              { term: { status: 'open' } },
              { term: { type: 'stale_rule' } },
            ],
          },
        },
      });
      expect(result).toBe(42);
    });

    it('returns 0 when index does not exist', async () => {
      esClient.count.mockResolvedValue({ count: 0 } as never);

      const result = await client.countFindings({ spaceId: 'default' });

      expect(result).toBe(0);
    });
  });
});
