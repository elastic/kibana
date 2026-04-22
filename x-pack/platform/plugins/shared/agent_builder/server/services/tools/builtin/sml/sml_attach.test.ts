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
import type { SmlDocument } from '@kbn/semantic-layer-plugin/server';
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

const mockResolve = jest.fn();
const getAttachmentTypeByOriginType = jest.fn().mockReturnValue({
  id: 'visualization',
  originType: 'lens',
  resolve: mockResolve,
  validate: jest.fn(),
  format: jest.fn(),
});

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {} },
  request: {},
  savedObjectsClient: {},
  attachments: { add: mockAttachmentsAdd },
  logger: mockLogger,
};

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
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      originType: 'lens',
    });
    getAttachmentTypeByOriginType.mockReturnValue({
      id: 'visualization',
      originType: 'lens',
      resolve: mockResolve,
      validate: jest.fn(),
      format: jest.fn(),
    });
  });

  it('has correct id and tags', () => {
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    expect(tool.id).toBe(platformCoreTools.smlAttach);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['sml', 'attachment']);
  });

  it('returns error when access denied', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, false]]));
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
  });

  it('returns error when document not found', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('not found in the index');
  });

  it('returns error when SML type has no originType', async () => {
    const chunkId = makeChunkId('unknown-type', 'ref-1');
    const smlDoc = createSmlDoc('unknown-type', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({ id: 'unknown-type' });
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'does not support attachment'
    );
  });

  it('returns error when no matching attachment type found', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    getAttachmentTypeByOriginType.mockReturnValue(undefined);
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'No attachment type with resolve found'
    );
  });

  it('adds attachment with origin (by-reference) when everything succeeds', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-123' });
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
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
        origin: 'ref-1',
        description: 'visualization/Test Viz',
      },
      'agent'
    );
  });

  it('returns error when attachments.add throws', async () => {
    const chunkId = makeChunkId('visualization', 'ref-1');
    const smlDoc = createSmlDoc('visualization', 'ref-1', CHUNK_UUID_A);
    mockCheckItemsAccess.mockResolvedValue(new Map([[chunkId, true]]));
    mockGetDocuments.mockResolvedValue(new Map([[chunkId, smlDoc]]));
    mockAttachmentsAdd.mockRejectedValue(new Error('Add failed'));
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
    const result = (await tool.handler(
      { chunk_ids: [chunkId] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Failed to attach SML item');
  });

  it('handles multiple items with mix of authorized and unauthorized', async () => {
    const chunkDenied = makeChunkId('visualization', 'ref-1', CHUNK_UUID_A);
    const chunkOk = makeChunkId('visualization', 'ref-2', CHUNK_UUID_B);
    const smlDoc = createSmlDoc('visualization', 'ref-2', CHUNK_UUID_B);
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        [chunkDenied, false],
        [chunkOk, true],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map([[chunkOk, smlDoc]]));
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-456' });
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
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
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-dup' });
    const tool = createSmlAttachTool({ getSmlService, getAttachmentTypeByOriginType });
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
});
