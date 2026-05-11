/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { loggerMock } from '@kbn/logging-mocks';
import type { SmlDocument, SmlService } from './types';
import { resolveSmlAttachItems } from './execute_sml_attach_items';

const createMockScopedClient = (): IScopedClusterClient =>
  ({
    asInternalUser: { search: jest.fn() } as unknown as ElasticsearchClient,
    asCurrentUser: { search: jest.fn() } as unknown as ElasticsearchClient,
  } as unknown as IScopedClusterClient);

const mockCheckItemsAccess = jest.fn();
const mockGetDocuments = jest.fn();
const mockGetTypeDefinition = jest.fn();

const createSmlService = (): SmlService =>
  ({
    checkItemsAccess: mockCheckItemsAccess,
    getDocuments: mockGetDocuments,
    getTypeDefinition: mockGetTypeDefinition,
  } as unknown as SmlService);

const createSmlDoc = (overrides: Partial<SmlDocument> = {}): SmlDocument => ({
  id: 'chunk-1',
  type: 'visualization',
  title: 'Test Viz',
  origin_id: 'ref-1',
  content: 'content',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
  spaces: ['default'],
  permissions: [],
  ...overrides,
});

const mockLogger = loggerMock.create();

const baseParams = {
  sml: createSmlService(),
  esClient: createMockScopedClient(),
  request: {} as KibanaRequest,
  spaceId: 'default',
  savedObjectsClient: {} as SavedObjectsClientContract,
  logger: mockLogger,
};

describe('resolveSmlAttachItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls checkItemsAccess with unique chunk ids', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: ['chunk-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
      request: baseParams.request,
    });
  });

  it('calls getDocuments with all unique chunk ids', async () => {
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['a', true],
        ['b', false],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map());
    await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['a', 'b'],
    });
    expect(mockGetDocuments).toHaveBeenCalledWith({
      ids: ['a', 'b'],
      spaceId: 'default',
      esClient: baseParams.esClient,
    });
  });

  it('dedupes chunk ids before access and document fetch', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1', 'chunk-1'],
    });
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: ['chunk-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
      request: baseParams.request,
    });
    expect(mockGetDocuments).toHaveBeenCalledWith({
      ids: ['chunk-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
    });
  });

  it('returns access denied when checkItemsAccess denies the chunk', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('Access denied');
      expect(results[0].chunk_id).toBe('chunk-1');
    }
    expect(mockGetTypeDefinition).not.toHaveBeenCalled();
  });

  it('returns not found when document is missing from getDocuments', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('not found in the index');
    }
    expect(mockGetTypeDefinition).not.toHaveBeenCalled();
  });

  it('returns error when getTypeDefinition is undefined', async () => {
    const smlDoc = createSmlDoc({ type: 'orphan-type' });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(undefined);
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('does not support conversion');
      expect(results[0].attachment_type).toBe('orphan-type');
    }
  });

  it('returns error when toAttachment returns undefined', async () => {
    const smlDoc = createSmlDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(undefined),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('toAttachment returned undefined');
    }
  });

  it('returns attachment data on success without persisting', async () => {
    const smlDoc = createSmlDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'visualization',
        data: { layers: [] },
        origin: 'custom-origin',
      }),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment).toEqual({
        type: 'visualization',
        data: { layers: [] },
        origin: 'custom-origin',
        description: 'visualization/Test Viz',
      });
      expect(results[0].chunk_id).toBe('chunk-1');
    }
  });

  it('uses toAttachment description when provided', async () => {
    const smlDoc = createSmlDoc({ origin_id: 'so-1' });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'visualization',
        data: { x: 1 },
        description: 'My asset',
      }),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment).toEqual({
        type: 'visualization',
        data: { x: 1 },
        origin: 'so-1',
        description: 'My asset',
      });
    }
  });

  it('falls back to smlDoc type/title when toAttachment omits description', async () => {
    const smlDoc = createSmlDoc({
      type: 'connector',
      title: 'My Drive',
      origin_id: 'so-1',
    });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'connector',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'connector',
        data: { connector_id: 'c1' },
      }),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment.description).toBe('connector/My Drive');
    }
  });

  it('uses smlDoc.origin_id when converted attachment has no origin', async () => {
    const smlDoc = createSmlDoc({ origin_id: 'fallback-origin' });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment.origin).toBe('fallback-origin');
      expect(results[0].attachment.description).toBe('visualization/Test Viz');
    }
  });

  it('returns failure and logs when toAttachment throws', async () => {
    const smlDoc = createSmlDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain("Failed to convert SML item 'chunk-1'");
    }
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('processes multiple chunk ids independently', async () => {
    const docOk = createSmlDoc({ id: 'chunk-ok', origin_id: 'r-ok' });
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['chunk-denied', false],
        ['chunk-ok', true],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map([['chunk-ok', docOk]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    });
    const results = await resolveSmlAttachItems({
      ...baseParams,
      chunkIds: ['chunk-denied', 'chunk-ok'],
    });
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
    if (results[1].success) {
      expect(results[1].attachment).toEqual({
        type: 'visualization',
        data: {},
        origin: 'r-ok',
        description: 'visualization/Test Viz',
      });
    }
  });
});
