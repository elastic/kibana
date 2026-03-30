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

  it('returns error when access denied', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', false]]));
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' }],
      },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(mockCheckItemsAccess).toHaveBeenCalledWith({
      items: [{ id: 'chunk-1', type: 'visualization' }],
      spaceId: 'default',
      esClient: mockContext.esClient.asCurrentUser,
      request: mockContext.request,
    });
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
    expect((result.results[0] as ErrorResult).data.message).toContain('chunk-1');
  });

  it('returns error when document not found', async () => {
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map());
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' }],
      },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('not found in the index');
    expect((result.results[0] as ErrorResult).data.message).toContain('chunk-1');
  });

  it('returns error when type definition is unknown', async () => {
    const smlDoc = createSmlDoc({ type: 'unknown-type' });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(undefined);
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'unknown-type' }],
      },
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
    const smlDoc = createSmlDoc();
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(undefined),
    });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' }],
      },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'toAttachment returned undefined'
    );
  });

  it('returns success when toAttachment returns data and attachments.add succeeds', async () => {
    const smlDoc = createSmlDoc();
    const convertedAttachment = { type: 'visualization', data: { layers: [] } };
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue(convertedAttachment),
    };
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-123' });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' }],
      },
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
      expect.any(String)
    );
  });

  it('returns error when toAttachment throws', async () => {
    const smlDoc = createSmlDoc();
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockRejectedValue(new Error('Conversion failed')),
    };
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-1', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-1', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [{ chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' }],
      },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Failed to convert SML item');
  });

  it('handles multiple items with mix of authorized and unauthorized', async () => {
    const smlDoc = createSmlDoc({ id: 'chunk-2' });
    const typeDef = {
      id: 'visualization',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment: jest.fn().mockResolvedValue({ type: 'visualization', data: {} }),
    };
    mockCheckItemsAccess.mockResolvedValue(
      new Map([
        ['chunk-1', false],
        ['chunk-2', true],
      ])
    );
    mockGetDocuments.mockResolvedValue(new Map([['chunk-2', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue(typeDef);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-456' });
    const tool = createSmlAttachTool({ getSmlService });
    const result = (await tool.handler(
      {
        items: [
          { chunk_id: 'chunk-1', attachment_id: 'ref-1', attachment_type: 'visualization' },
          { chunk_id: 'chunk-2', attachment_id: 'ref-2', attachment_type: 'visualization' },
        ],
      },
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

  it('uses real SmlDocument from getDocuments when calling toAttachment', async () => {
    const smlDoc = createSmlDoc({
      id: 'chunk-real',
      title: 'Real Document Title',
      type: 'dashboard',
    });
    const toAttachment = jest.fn().mockResolvedValue({ type: 'dashboard', data: {} });
    mockCheckItemsAccess.mockResolvedValue(new Map([['chunk-real', true]]));
    mockGetDocuments.mockResolvedValue(new Map([['chunk-real', smlDoc]]));
    mockGetTypeDefinition.mockReturnValue({
      id: 'dashboard',
      list: jest.fn(),
      getSmlData: jest.fn(),
      toAttachment,
    });
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-789' });
    const tool = createSmlAttachTool({ getSmlService });
    await tool.handler(
      {
        items: [
          {
            chunk_id: 'chunk-real',
            attachment_id: 'ref-real',
            attachment_type: 'dashboard',
          },
        ],
      },
      mockContext as unknown as ToolHandlerContext
    );
    expect(toAttachment).toHaveBeenCalledWith(smlDoc, {
      request: mockContext.request,
      savedObjectsClient: mockContext.savedObjectsClient,
      spaceId: 'default',
    });
    expect(toAttachment).toHaveBeenCalledTimes(1);
  });
});
