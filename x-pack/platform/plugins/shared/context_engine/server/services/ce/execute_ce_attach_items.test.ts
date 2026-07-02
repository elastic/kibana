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
import type { CeDocument, CeService } from './types';
import { resolveCeAttachItems } from './execute_ce_attach_items';

const createMockScopedClient = (): IScopedClusterClient =>
  ({
    asInternalUser: { search: jest.fn() } as unknown as ElasticsearchClient,
    asCurrentUser: { search: jest.fn() } as unknown as ElasticsearchClient,
  } as unknown as IScopedClusterClient);

const mockCheckItemsAccess = jest.fn();
const mockGetDocuments = jest.fn();
const mockGetTypeDefinition = jest.fn();

const createCeService = (): CeService =>
  ({
    checkItemsAccess: mockCheckItemsAccess,
    getDocuments: mockGetDocuments,
    getTypeDefinition: mockGetTypeDefinition,
  } as unknown as CeService);

const createCeDoc = (overrides: Partial<CeDocument> = {}): CeDocument => ({
  id: 'entry-1',
  type: 'visualization',
  title: 'Test Viz',
  origin_id: 'ref-1',
  origin: { uri: 'ref-1' },
  content: 'content',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
  spaces: ['default'],
  permissions: { kibana: { privileges: [] }, elasticsearch: { indices: [] } },
  ingestion_method: 'crawled',
  ...overrides,
});

const mockLogger = loggerMock.create();

const baseParams = {
  ce: createCeService(),
  esClient: createMockScopedClient(),
  request: {} as KibanaRequest,
  spaceId: 'default',
  savedObjectsClient: {} as SavedObjectsClientContract,
  logger: mockLogger,
};

describe('resolveCeAttachItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls checkItemsAccess with unique entry ids', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', false]]));
    await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: ['entry-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
      request: baseParams.request,
    });
  });

  it('calls getDocuments with all unique entry ids', async () => {
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['a', true],
        ['b', false],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map());
    await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['a', 'b'],
    });
    expect(mockGetDocuments).toHaveBeenCalledWith({
      ids: ['a', 'b'],
      spaceId: 'default',
      esClient: baseParams.esClient,
    });
  });

  it('dedupes entry ids before access and document fetch', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1', 'entry-1'],
    });
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: ['entry-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
      request: baseParams.request,
    });
    expect(mockGetDocuments).toHaveBeenCalledWith({
      ids: ['entry-1'],
      spaceId: 'default',
      esClient: baseParams.esClient,
    });
  });

  it('returns access denied when checkItemsAccess denies the entry', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', false]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('Access denied');
      expect(results[0].entry_id).toBe('entry-1');
    }
    expect(mockGetTypeDefinition).not.toHaveBeenCalled();
  });

  it('returns not found when document is missing from getDocuments', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('not found in the index');
    }
    expect(mockGetTypeDefinition).not.toHaveBeenCalled();
  });

  it('returns error when getTypeDefinition is undefined', async () => {
    const ceDoc = createCeDoc({ type: 'orphan-type' });
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue(undefined);
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('does not support conversion');
      expect(results[0].attachment_type).toBe('orphan-type');
    }
  });

  it('returns error when toAttachment returns undefined', async () => {
    const ceDoc = createCeDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(undefined),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain('toAttachment returned undefined');
    }
  });

  it('returns attachment data on success without persisting', async () => {
    const ceDoc = createCeDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'visualization',
        data: { layers: [] },
        origin: 'custom-origin',
      }),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment).toEqual({
        type: 'visualization',
        data: { layers: [] },
        origin: 'custom-origin',
        description: 'visualization/Test Viz',
      });
      expect(results[0].entry_id).toBe('entry-1');
    }
  });

  it('uses toAttachment description when provided', async () => {
    const ceDoc = createCeDoc({ origin_id: 'so-1', origin: { uri: 'so-1' } });
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'visualization',
        data: { x: 1 },
        description: 'My asset',
      }),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
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

  it('falls back to ceDoc type/title when toAttachment omits description', async () => {
    const ceDoc = createCeDoc({
      type: 'connector',
      title: 'My Drive',
      origin_id: 'so-1',
      origin: { uri: 'so-1' },
    });
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'connector',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({
        type: 'connector',
        data: { connector_id: 'c1' },
      }),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment.description).toBe('connector/My Drive');
    }
  });

  it('uses ceDoc.origin.uri when converted attachment has no origin', async () => {
    const ceDoc = createCeDoc({
      origin_id: 'fallback-origin',
      origin: { uri: 'fallback-origin' },
    });
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(true);
    if (results[0].success) {
      expect(results[0].attachment.origin).toBe('fallback-origin');
      expect(results[0].attachment.description).toBe('visualization/Test Viz');
    }
  });

  it('returns failure and logs when toAttachment throws', async () => {
    const ceDoc = createCeDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['entry-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['entry-1', ceDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-1'],
    });
    expect(results[0].success).toBe(false);
    if (!results[0].success) {
      expect(results[0].message).toContain("Failed to convert CE item 'entry-1'");
    }
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('processes multiple entry ids independently', async () => {
    const docOk = createCeDoc({ id: 'entry-ok', origin_id: 'r-ok', origin: { uri: 'r-ok' } });
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['entry-denied', false],
        ['entry-ok', true],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map([['entry-ok', docOk]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getCeData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    });
    const results = await resolveCeAttachItems({
      ...baseParams,
      entryIds: ['entry-denied', 'entry-ok'],
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
