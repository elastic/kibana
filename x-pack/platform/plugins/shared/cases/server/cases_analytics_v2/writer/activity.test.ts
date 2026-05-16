/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import { ACTIVITY_INDEX_NAME } from '../constants';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import { CasesActivityV2Writer } from './activity';

/**
 * Tests for the activity writer focused on the cascade-by-case-ids
 * path — `bulkDeleteActionsByCaseIds` uses `delete_by_query` rather
 * than `_bulk` (because the writer doesn't know which user-action
 * SO ids existed for the deleted cases) and is the
 * highest-risk-of-difference method on the contract. The bulk
 * upsert path mirrors the cases-surface writer's already-tested
 * shape.
 */

const buildWriterUnderTest = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const writer = new CasesActivityV2Writer({
    esClient,
    logger,
    maxRetries: 1,
    retryInitialDelayMs: 1,
  });
  return { writer, esClient, logger };
};

const makeUserActionSO = (
  id: string,
  caseId = 'case-1'
): SavedObject<UserActionPersistedAttributes> =>
  ({
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [
      { id: caseId, type: CASE_SAVED_OBJECT, name: 'associated-cases' } as SavedObjectReference,
    ],
    attributes: {
      action: 'create',
      type: 'create_case',
      payload: { title: 'X' },
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: { username: 'jane', full_name: null, email: null, profile_uid: 'p-1' },
      owner: 'securitySolution',
    } as unknown as UserActionPersistedAttributes,
  } as SavedObject<UserActionPersistedAttributes>);

describe('CasesActivityV2Writer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsertActions', () => {
    it('dispatches one _bulk request with index ops per user action', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      writer.bulkUpsertActions([makeUserActionSO('ua-1'), makeUserActionSO('ua-2')]);
      await new Promise((r) => setImmediate(r));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations;
      // 2 actions × 2 entries (header + doc) = 4 operations.
      expect(operations).toHaveLength(4);
      expect(operations[0]).toEqual({ index: { _index: ACTIVITY_INDEX_NAME, _id: 'ua-1' } });
      expect(operations[2]).toEqual({ index: { _index: ACTIVITY_INDEX_NAME, _id: 'ua-2' } });
    });

    it('skips dispatch when the array is empty', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      writer.bulkUpsertActions([]);
      await new Promise((r) => setImmediate(r));
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteActionsByCaseIds (cascade path)', () => {
    it('dispatches a single delete_by_query against `cases.id` for every supplied case id', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      (esClient.deleteByQuery as unknown as jest.Mock).mockResolvedValue({ deleted: 0 });

      writer.bulkDeleteActionsByCaseIds(['case-1', 'case-2']);
      // Fire-and-forget — flush microtasks.
      await new Promise((r) => setImmediate(r));

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const arg = (esClient.deleteByQuery as unknown as jest.Mock).mock.calls[0][0];
      expect(arg.index).toBe(ACTIVITY_INDEX_NAME);
      // `terms` query on the denormalized cases.id keyword field —
      // not by user-action ids (the writer doesn't know them after
      // the SO-layer cascade).
      expect(arg.query).toEqual({ terms: { 'cases.id': ['case-1', 'case-2'] } });
      // `refresh: false` — bulk cascade is background work; refresh
      // costs add up on bulk-delete-heavy workloads.
      expect(arg.refresh).toBe(false);
      // `conflicts: 'proceed'` — a concurrent reconciliation re-emit
      // must not fail the whole delete-by-query.
      expect(arg.conflicts).toBe('proceed');
    });

    it('skips dispatch when the case-id array is empty', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      writer.bulkDeleteActionsByCaseIds([]);
      await new Promise((r) => setImmediate(r));
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('treats a 404 on the index itself as a no-op (analytics not bootstrapped yet)', async () => {
      const { writer, esClient, logger } = buildWriterUnderTest();
      // Mid-flight enable: the AttachmentService cascades trigger
      // before the v2 service has finished bootstrapping the index.
      // The writer must swallow the 404 without surfacing it as a
      // retry-budget-exhaustion ERROR — otherwise on-call sees a
      // false alarm for a benign race.
      (esClient.deleteByQuery as unknown as jest.Mock).mockRejectedValue({
        statusCode: 404,
        message: 'index_not_found_exception',
      });

      writer.bulkDeleteActionsByCaseIds(['case-1']);
      await new Promise((r) => setImmediate(r));

      // No retry-budget-exhausted WARN should fire.
      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('write failed after'))).toBe(false);
    });
  });
});
