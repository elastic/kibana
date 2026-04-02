/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import {
  ToolResultType,
  type ErrorResult,
  type OtherResult,
} from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import type { SmlDocument } from '../../../sml';
import { createSmlAttachTool } from './sml_attach';

const mockCheckItemsAccess = jest.fn();
const mockGetDocuments = jest.fn();
const mockGetTypeDefinition = jest.fn();
const mockAttachmentsAdd = jest.fn();

const getSmlService = jest.fn(() => ({
  search: jest.fn(),
  checkItemsAccess: mockCheckItemsAccess,
  indexAttachment: jest.fn(),
  getDocuments: mockGetDocuments,
  getTypeDefinition: mockGetTypeDefinition,
  listTypeDefinitions: jest.fn(),
  getCrawler: jest.fn(),
}));

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {} },
  request: {},
  savedObjectsClient: {},
  attachments: { add: mockAttachmentsAdd },
  logger: mockLogger,
};

/** Example chunk id suffix (indexed documents use type:origin:uuid style). */
const CHUNK_UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const CHUNK_UUID_B = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

const makeChunkId = (type: string, originId: string, uuid = CHUNK_UUID_A) =>
  `${type}:${originId}:${uuid}`;

const createSmlDoc = (
  type: string,
  originId: string,
  uuid: string,
  overrides: Partial<SmlDocument> = {}
): SmlDocument => ({
  id: makeChunkId(type, originId, uuid),
  type,
  title: 'Test Viz',
  origin_id: originId,
  content: 'content',
  created_at: '2024-01-01',
  updated_at: '2024-01-02',
  spaces: ['default'],
  permissions: [],
  ...overrides,
});

describe('createSmlAttachTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct id and tags', () => {
    const tool = createSmlAttachTool({ getSmlService });
    expect(tool.id).toBe(platformCoreTools.smlAttach);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['sml', 'attachment']);
  });

  it('returns error when chunk_id is unknown or access denied (no index document)', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: ['chunk-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: ['chunk-1'],
      spaceId: 'default',
      esClient: mockContext.esClient.asCurrentUser,
      request: mockContext.request,
    });
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
  });

  it('returns error when access denied', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, false]]));
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: [chunkId],
      spaceId: 'default',
      esClient: mockContext.esClient.asCurrentUser,
      request: mockContext.request,
    });
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
    expect((result.results[0] as ErrorResult).data.message).toContain(chunkId);
  });

  it('returns error when document not found', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('not found in the index');
    expect((result.results[0] as ErrorResult).data.message).toContain(chunkId);
  });

  it('returns error when type definition is unknown', async () => {
    const chunkId = makeChunkId('unknown-type', 'ref-1');
    const smlDoc = createSmlDoc('unknown-type', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(undefined);
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'does not support conversion to attachment'
    );
    expect((result.results[0] as ErrorResult).data.message).toContain('unknown-type');
  });

  it('returns error when toAttachment returns undefined', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(undefined),
    });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'toAttachment returned undefined'
    );
  });

  it('returns success when toAttachment returns data and attachments.add succeeds', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    const convertedAttachment = { type: 'visualization', data: { layers: [] } };
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(convertedAttachment),
    };
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-123' });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.other);
    const successData = (
      result.results[0] as OtherResult<{
        success: boolean;
        attachment_id: string;
        attachment_type: string;
      }>
    ).data;
    expect(successData.success).toBe(true);
    expect(successData.attachment_id).toBe('att-123');
    expect(successData.attachment_type).toBe('visualization');
    expect(mockAttachmentsAdd).toHaveBeenCalledWith(
      {
        type: 'visualization',
        data: { layers: [] },
        origin: 'ref-1',
      },
      'agent'
    );
  });

  it('returns error when toAttachment throws', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockRejectedValue(new Error('Conversion failed')),
    };
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Failed to convert SML item');
  });

  it('handles multiple items with mix of authorized and unauthorized', async () => {
    const chunkDenied = makeChunkId('visualization', 'ref-1', CHUNK_UUID_A);
    const chunkOk = makeChunkId('visualization', 'ref-2', CHUNK_UUID_B);
    const smlDoc = createSmlDoc('visualization', 'ref-2', CHUNK_UUID_B);
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    };
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        [chunkDenied, false],
        [chunkOk, true],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map([[chunkOk, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-456' });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkDenied, chunkOk] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(2);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
    expect((result.results[1] as { type: string }).type).toBe(ToolResultType.other);
    const multiSuccessData = (
      result.results[1] as OtherResult<{ success: boolean; attachment_id: string }>
    ).data;
    expect(multiSuccessData.success).toBe(true);
    expect(multiSuccessData.attachment_id).toBe('att-456');
  });

  it('dedupes duplicate chunk_ids in one call', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    });
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-dup' });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      { chunk_ids: [chunkId, chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      ids: [chunkId],
      spaceId: 'default',
      esClient: mockContext.esClient.asCurrentUser,
      request: mockContext.request,
    });
    expect(mockAttachmentsAdd).toHaveBeenCalledTimes(1);
  });

  it('uses real SmlDocument from getDocuments when calling toAttachment', async () => {
    const chunkId = makeChunkId('dashboard', 'ref-real');
    const smlDoc = createSmlDoc('dashboard', 'ref-real', CHUNK_UUID_A, {
      title: 'Real Document Title',
      type: 'dashboard',
      origin_id: 'ref-real',
    });
    const toAttachment = jest.fn().mockResolvedValue({ type: 'dashboard', data: {} });
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'dashboard',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment,
    });
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-789' });
    const tool = createSmlAttachTool({ getSmlService });
    await tool.handler({ chunk_ids: [chunkId] }, mockContext as unknown as ToolHandlerContext);
    expect(toAttachment).toHaveBeenCalledWith(smlDoc, {
      request: mockContext.request,
      savedObjectsClient: mockContext.savedObjectsClient,
      spaceId: 'default',
    });
    expect(toAttachment).toHaveBeenCalledTimes(1);
  });
});
