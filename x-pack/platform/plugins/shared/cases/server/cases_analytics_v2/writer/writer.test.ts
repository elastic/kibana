/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  CasePersistedSeverity,
  CasePersistedStatus,
  type CasePersistedAttributes,
} from '../../common/types/case';
import { CASE_INDEX_NAME } from '../constants';
import { CasesAnalyticsV2Writer } from '.';

const makeCase = (id: string): SavedObject<CasePersistedAttributes> =>
  ({
    type: CASE_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [],
    attributes: {
      owner: 'securitySolution',
      title: id,
      description: '',
      tags: [],
      assignees: [],
      severity: CasePersistedSeverity.LOW,
      status: CasePersistedStatus.OPEN,
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
      closed_at: null,
      created_by: { username: 'jane', full_name: 'J', email: 'j@e.com', profile_uid: 'p-1' },
      closed_by: null,
      updated_by: null,
      duration: null,
      total_alerts: 0,
      total_comments: 0,
      connector: { name: 'none', type: '.none', fields: null },
      external_service: null,
      settings: { syncAlerts: false },
    } as unknown as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

const makeWriter = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const writer = new CasesAnalyticsV2Writer({
    esClient,
    logger,
    // Tight retry budget — keeps the failure-path tests fast.
    maxRetries: 1,
    retryInitialDelayMs: 1,
  });
  return { writer, esClient, logger };
};

describe('CasesAnalyticsV2Writer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsertCases', () => {
    it('dispatches one `_bulk` request with index ops per case', async () => {
      const { writer, esClient } = makeWriter();
      (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      writer.bulkUpsertCases([makeCase('case-A'), makeCase('case-B')]);
      // Fire-and-forget — flush microtasks.
      await new Promise((r) => setImmediate(r));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const operations = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
      // 2 cases × 2 entries (header + doc) = 4 operations.
      expect(operations).toHaveLength(4);
      expect(operations[0]).toEqual({
        index: { _index: CASE_INDEX_NAME, _id: 'case-A' },
      });
      expect(operations[2]).toEqual({
        index: { _index: CASE_INDEX_NAME, _id: 'case-B' },
      });
    });

    it('skips dispatch when the array is empty', async () => {
      const { writer, esClient } = makeWriter();

      writer.bulkUpsertCases([]);
      await new Promise((r) => setImmediate(r));

      expect(esClient.bulk).not.toHaveBeenCalled();
    });

    it('logs per-item failures at WARN but does not throw to the caller', async () => {
      const { writer, esClient, logger } = makeWriter();
      (esClient.bulk as jest.Mock).mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'case-A', status: 201 } },
          { index: { _id: 'case-B', status: 400, error: { reason: 'mapper exception' } } },
        ],
      });

      writer.bulkUpsertCases([makeCase('case-A'), makeCase('case-B')]);
      await new Promise((r) => setImmediate(r));

      // First call: the per-item failure for case-B.
      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(
        warnCalls.some((m: string) => m.includes('case-B') && m.includes('mapper exception'))
      ).toBe(true);
    });
  });

  describe('bulkDeleteCases', () => {
    it('dispatches one `_bulk` request with delete ops per id', async () => {
      const { writer, esClient } = makeWriter();
      (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      writer.bulkDeleteCases(['a', 'b', 'c']);
      await new Promise((r) => setImmediate(r));

      const operations = (esClient.bulk as jest.Mock).mock.calls[0][0].operations;
      expect(operations).toEqual([
        { delete: { _index: CASE_INDEX_NAME, _id: 'a' } },
        { delete: { _index: CASE_INDEX_NAME, _id: 'b' } },
        { delete: { _index: CASE_INDEX_NAME, _id: 'c' } },
      ]);
    });

    it('treats per-item 404s as no-ops (no WARN log)', async () => {
      const { writer, esClient, logger } = makeWriter();
      (esClient.bulk as jest.Mock).mockResolvedValue({
        errors: true,
        items: [
          { delete: { _id: 'a', status: 200 } },
          {
            delete: {
              _id: 'b',
              status: 404,
              error: { reason: 'document_missing_exception' },
            },
          },
        ],
      });

      writer.bulkDeleteCases(['a', 'b']);
      await new Promise((r) => setImmediate(r));

      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      // Should NOT log anything about case-b — 404 = post-state met.
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('case-b'))).toBe(false);
    });
  });

  describe('bulkUpsertCasesAwait', () => {
    it('resolves to undefined on success and dispatches one bulk', async () => {
      const { writer, esClient } = makeWriter();
      (esClient.bulk as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      const result = await writer.bulkUpsertCasesAwait([makeCase('case-A')]);
      expect(result).toBeUndefined();
      expect(esClient.bulk).toHaveBeenCalledTimes(1);
    });

    it('resolves (does not throw) when the bulk request fails its retry budget', async () => {
      const { writer, esClient, logger } = makeWriter();
      (esClient.bulk as jest.Mock).mockRejectedValue(new Error('cluster down'));

      // Should not reject — caller (reconciliation) shouldn't crash.
      await expect(writer.bulkUpsertCasesAwait([makeCase('case-A')])).resolves.toBeUndefined();

      // WARN log emitted by fireAndForget after retries exhaust.
      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('write failed after'))).toBe(true);
    });

    it('skips dispatch on empty input', async () => {
      const { writer, esClient } = makeWriter();

      await writer.bulkUpsertCasesAwait([]);
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('fireAndForget logging', () => {
    it('downgrades post-retry-budget failures to WARN (not ERROR)', async () => {
      const { writer, esClient, logger } = makeWriter();
      (esClient.index as jest.Mock).mockRejectedValue(new Error('boom'));

      writer.upsertCase(makeCase('case-A'));
      // Wait long enough for retries + jittered backoff to complete.
      await new Promise((r) => setTimeout(r, 100));

      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      // ERROR must NOT have been called — that would re-introduce alert spam
      // during bulk-op blips.
      expect(childLogger.error).not.toHaveBeenCalled();
      expect(childLogger.warn).toHaveBeenCalled();
    });
  });
});
