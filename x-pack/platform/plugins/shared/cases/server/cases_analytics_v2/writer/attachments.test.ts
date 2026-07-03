/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectReference } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { ATTACHMENTS_INDEX_NAME } from '../constants';
import type { AttachmentPersistedAttributes } from '../../common/types/attachments_v2';
import { CasesAttachmentsV2Writer } from './attachments';

/**
 * Tests for the attachments writer focused on:
 *   - The cascade-by-case-ids path (`bulkDeleteAttachmentsByCaseIds`)
 *     uses `delete_by_query` rather than `_bulk` because the writer
 *     doesn't know which attachment SO ids existed for the deleted
 *     cases. Same reasoning as the activity writer's cascade path
 *     but with one extra dimension: the cascade must cover BOTH
 *     source SO types (legacy + unified) — handled implicitly by
 *     querying on the denormalized `cases.id` on the analytics index.
 *   - The per-id delete path (`bulkDeleteAttachments`) which
 *     attachments need but activity doesn't (user-actions are
 *     immutable; attachments are mutable + per-id-deletable).
 */

const buildWriterUnderTest = () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggerMock.create();
  const writer = new CasesAttachmentsV2Writer({
    esClient,
    logger,
    maxRetries: 1,
    retryInitialDelayMs: 1,
  });
  return { writer, esClient, logger };
};

const makeLegacyAttachmentSO = (
  id: string,
  caseId = 'case-1'
): SavedObject<AttachmentPersistedAttributes> =>
  ({
    type: CASE_COMMENT_SAVED_OBJECT,
    id,
    namespaces: ['default'],
    references: [
      { id: caseId, type: CASE_SAVED_OBJECT, name: 'associated-cases' } as SavedObjectReference,
    ],
    attributes: {
      type: 'user',
      comment: 'X',
      owner: 'securitySolution',
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: { username: 'jane', full_name: null, email: null, profile_uid: 'p-1' },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    } as unknown as AttachmentPersistedAttributes,
  } as SavedObject<AttachmentPersistedAttributes>);

describe('CasesAttachmentsV2Writer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bulkUpsertAttachments', () => {
    it('dispatches one _bulk request with index ops per attachment', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      writer.bulkUpsertAttachments([
        makeLegacyAttachmentSO('att-1'),
        makeLegacyAttachmentSO('att-2'),
      ]);
      await new Promise((r) => setImmediate(r));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations;
      expect(operations).toHaveLength(4);
      expect(operations[0]).toEqual({ index: { _index: ATTACHMENTS_INDEX_NAME, _id: 'att-1' } });
      expect(operations[2]).toEqual({ index: { _index: ATTACHMENTS_INDEX_NAME, _id: 'att-2' } });
    });

    it('skips dispatch when the array is empty', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      writer.bulkUpsertAttachments([]);
      await new Promise((r) => setImmediate(r));
      expect(esClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteAttachments (per-id delete path)', () => {
    it('dispatches one _bulk request with delete ops per id', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({ errors: false, items: [] });

      writer.bulkDeleteAttachments(['att-1', 'att-2']);
      await new Promise((r) => setImmediate(r));

      expect(esClient.bulk).toHaveBeenCalledTimes(1);
      const operations = (esClient.bulk as unknown as jest.Mock).mock.calls[0][0].operations;
      expect(operations).toEqual([
        { delete: { _index: ATTACHMENTS_INDEX_NAME, _id: 'att-1' } },
        { delete: { _index: ATTACHMENTS_INDEX_NAME, _id: 'att-2' } },
      ]);
    });

    it('treats per-item 404s as success (post-state already met)', async () => {
      const { writer, esClient, logger } = buildWriterUnderTest();
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({
        errors: true,
        items: [
          { delete: { _id: 'att-1', status: 200 } },
          // 404 on the second is a no-op — the doc was already gone.
          { delete: { _id: 'att-2', status: 404, error: { reason: 'not_found' } } },
        ],
      });

      writer.bulkDeleteAttachments(['att-1', 'att-2']);
      await new Promise((r) => setImmediate(r));

      // 404s should NOT contribute to per-item WARN logs.
      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('att-2') && m.includes('not_found'))).toBe(
        false
      );
    });

    it('logs per-item failures other than 404 at WARN', async () => {
      const { writer, esClient, logger } = buildWriterUnderTest();
      (esClient.bulk as unknown as jest.Mock).mockResolvedValue({
        errors: true,
        items: [{ delete: { _id: 'att-1', status: 500, error: { reason: 'cluster busy' } } }],
      });

      writer.bulkDeleteAttachments(['att-1']);
      await new Promise((r) => setImmediate(r));

      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('att-1') && m.includes('cluster busy'))).toBe(
        true
      );
    });
  });

  describe('bulkDeleteAttachmentsByCaseIds (cascade path)', () => {
    it('dispatches a single delete_by_query against `cases.id` for every supplied case id', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      (esClient.deleteByQuery as unknown as jest.Mock).mockResolvedValue({ deleted: 0 });

      writer.bulkDeleteAttachmentsByCaseIds(['case-1', 'case-2']);
      await new Promise((r) => setImmediate(r));

      expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
      const arg = (esClient.deleteByQuery as unknown as jest.Mock).mock.calls[0][0];
      expect(arg.index).toBe(ATTACHMENTS_INDEX_NAME);
      // `terms` query on the denormalized cases.id — implicitly
      // covers BOTH source SO types (legacy + unified) because the
      // analytics doc shape is unified and keyed only on the source
      // SO id.
      expect(arg.query).toEqual({ terms: { 'cases.id': ['case-1', 'case-2'] } });
      expect(arg.refresh).toBe(false);
      expect(arg.conflicts).toBe('proceed');
    });

    it('skips dispatch when the case-id array is empty', async () => {
      const { writer, esClient } = buildWriterUnderTest();
      writer.bulkDeleteAttachmentsByCaseIds([]);
      await new Promise((r) => setImmediate(r));
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });

    it('treats a 404 on the index itself as a no-op (analytics not bootstrapped yet)', async () => {
      const { writer, esClient, logger } = buildWriterUnderTest();
      (esClient.deleteByQuery as unknown as jest.Mock).mockRejectedValue({
        statusCode: 404,
        message: 'index_not_found_exception',
      });

      writer.bulkDeleteAttachmentsByCaseIds(['case-1']);
      await new Promise((r) => setImmediate(r));

      const childLogger = (logger.get as jest.Mock).mock.results[0]?.value ?? logger;
      const warnCalls = (childLogger.warn as jest.Mock).mock.calls.map(([msg]: [string]) => msg);
      expect(warnCalls.some((m: string) => m.includes('write failed after'))).toBe(false);
    });
  });
});
