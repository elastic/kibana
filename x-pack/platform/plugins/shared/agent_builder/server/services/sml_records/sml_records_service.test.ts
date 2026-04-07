/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { loggerMock } from '@kbn/logging-mocks';
import { isSmlRecordNotFoundError } from '@kbn/agent-builder-common';
import { SmlRecordsServiceImpl } from './sml_records_service';
import type { SmlRecordsClient } from './types';
import type { SmlRecordCreateBody } from '../../../common/http_api/sml_records';

// --- Mock the storage adapter ---

const mockIndex = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

const mockGetClient = jest.fn().mockReturnValue({
  index: mockIndex,
  get: mockGet,
  delete: mockDelete,
});

jest.mock('./storage', () => ({
  createSmlRecordsStorage: jest.fn().mockReturnValue({
    getClient: () => mockGetClient(),
  }),
  smlRecordsIndexName: '.kibana-agent-builder-sml-data',
}));

// --- Helpers ---

const createNotFoundError = () =>
  new errors.ResponseError({
    statusCode: 404,
    body: { error: { type: 'index_not_found_exception' } },
    warnings: [],
    headers: {},
    meta: {} as any,
  });

const createMockLogger = () => {
  const log = loggerMock.create();
  log.get = jest.fn().mockReturnValue(log);
  return log;
};

const mockEsClient = {
  search: jest.fn(),
} as any;
const mockRequest = {} as any;

const mockElasticsearch = {
  client: {
    asScoped: jest.fn().mockReturnValue({
      asInternalUser: mockEsClient,
    }),
  },
} as any;

const sampleRecordBody: SmlRecordCreateBody = {
  type: 'index',
  title: 'My Index',
  origin_id: 'projects',
  content: 'Index summary',
  spaces: ['*'],
  tags: ['saas'],
};

describe('SmlRecordsService', () => {
  let client: SmlRecordsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-01T00:00:00.000Z'));
    const service = new SmlRecordsServiceImpl({
      logger: createMockLogger(),
      elasticsearch: mockElasticsearch,
    });
    client = service.getScopedClient({ request: mockRequest });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createOrUpdate', () => {
    it('creates a new record when it does not exist', async () => {
      mockGet.mockRejectedValueOnce(createNotFoundError());
      mockIndex.mockResolvedValueOnce({ result: 'created' });

      const result = await client.createOrUpdate('rec-1', sampleRecordBody);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'rec-1',
          type: 'index',
          title: 'My Index',
          user_defined: true,
          semantic_title: 'My Index',
          semantic_content: 'Index summary',
          permissions: [],
          tags: ['saas'],
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        })
      );

      expect(mockIndex).toHaveBeenCalledWith({
        id: 'rec-1',
        document: expect.objectContaining({
          id: 'rec-1',
          user_defined: true,
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
        }),
      });
    });

    it('preserves created_at when updating an existing record', async () => {
      mockGet.mockResolvedValueOnce({
        _source: {
          ...sampleRecordBody,
          id: 'rec-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      });
      mockIndex.mockResolvedValueOnce({ result: 'updated' });

      const updatedBody = { ...sampleRecordBody, title: 'Updated Title' };
      const result = await client.createOrUpdate('rec-1', updatedBody);

      expect(result.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(result.updated_at).toBe('2026-04-01T00:00:00.000Z');
      expect(result.title).toBe('Updated Title');
    });

    it('propagates non-404 errors from get', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.createOrUpdate('rec-1', sampleRecordBody)).rejects.toThrow(
        'Connection refused'
      );
    });
  });

  describe('get', () => {
    it('returns the record when found', async () => {
      const storedRecord = {
        id: 'rec-1',
        type: 'index',
        title: 'My Index',
        origin_id: 'projects',
        content: 'Index summary',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        spaces: ['*'],
        permissions: [],
        tags: ['saas'],
        user_defined: true,
      };
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _source: storedRecord }] },
      });

      const result = await client.get('rec-1');

      expect(result).toEqual(expect.objectContaining({ id: 'rec-1', title: 'My Index' }));
    });

    it('throws smlRecordNotFound when record does not exist', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      try {
        await client.get('nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRecordNotFoundError(error)).toBe(true);
      }
    });

    it('throws smlRecordNotFound when _source is missing', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [{ _source: undefined }] },
      });

      try {
        await client.get('rec-1');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRecordNotFoundError(error)).toBe(true);
      }
    });

    it('throws smlRecordNotFound when index does not exist', async () => {
      mockEsClient.search.mockRejectedValueOnce(createNotFoundError());

      try {
        await client.get('rec-1');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRecordNotFoundError(error)).toBe(true);
      }
    });

    it('propagates non-404 errors', async () => {
      mockEsClient.search.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.get('rec-1')).rejects.toThrow('Connection refused');
    });
  });

  describe('delete', () => {
    it('returns true when record is deleted', async () => {
      mockDelete.mockResolvedValueOnce({ result: 'deleted' });

      const result = await client.delete('rec-1');

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({ id: 'rec-1' });
    });

    it('throws smlRecordNotFound when record does not exist', async () => {
      mockDelete.mockRejectedValueOnce(createNotFoundError());

      try {
        await client.delete('nonexistent');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isSmlRecordNotFoundError(error)).toBe(true);
      }
    });

    it('propagates non-404 errors', async () => {
      mockDelete.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.delete('rec-1')).rejects.toThrow('Connection refused');
    });
  });
});
