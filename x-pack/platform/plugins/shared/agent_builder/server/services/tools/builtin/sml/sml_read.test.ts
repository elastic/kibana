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
import { createSmlReadTool } from './sml_read';

const mockResolveSmlAttachItems = jest.fn();

const mockGetResolverType = jest.fn();

const getAgentContextLayer = jest.fn(() => ({
  search: jest.fn(),
  checkItemsAccess: jest.fn(),
  indexAttachment: jest.fn(),
  getDocuments: jest.fn(),
  getTypeDefinition: jest.fn(),
  resolveSmlAttachItems: mockResolveSmlAttachItems,
  getResolverType: jest.fn(),
  hasResolverType: jest.fn(),
  listResolverTypes: jest.fn(() => []),
}));

const getSmlReadResolverService = jest.fn(() => ({
  getResolverType: mockGetResolverType,
}));

const smlToolOptions = { getAgentContextLayer, getSmlReadResolverService };

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {}, asInternalUser: {} },
  request: {},
  savedObjectsClient: {},
  attachments: {},
  logger: mockLogger,
};

describe('createSmlReadTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct id and tags', () => {
    const tool = createSmlReadTool(smlToolOptions);
    expect(tool.id).toBe(platformCoreTools.smlRead);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['sml']);
  });

  it('returns error when resolve reports access denied', async () => {
    mockResolveSmlAttachItems.mockResolvedValue([
      {
        success: false,
        chunk_id: 'chunk-1',
        message: 'Access denied: you do not have the required permissions',
      },
    ]);
    const tool = createSmlReadTool(smlToolOptions);
    const result = (await tool.handler(
      { chunk_ids: ['chunk-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
  });

  it('returns error when resolver type definition is missing', async () => {
    mockResolveSmlAttachItems.mockResolvedValue([
      {
        success: true,
        chunk_id: 'chunk-1',
        attachment: {
          type: 'unknown-type',
          data: {},
          origin: 'ref-1',
          description: 'x',
        },
      },
    ]);
    mockGetResolverType.mockReturnValue(undefined);
    const tool = createSmlReadTool(smlToolOptions);
    const result = (await tool.handler(
      { chunk_ids: ['chunk-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain(
      'No resolver type definition'
    );
  });

  it('returns format and bounded_tools on success', async () => {
    mockResolveSmlAttachItems.mockResolvedValue([
      {
        success: true,
        chunk_id: 'chunk-1',
        attachment: {
          type: 'visualization',
          data: { layers: [] },
          origin: 'ref-1',
          description: 'visualization/Test',
        },
      },
    ]);
    mockGetResolverType.mockReturnValue({
      id: 'visualization',
      validate: jest.fn(),
      format: jest.fn().mockResolvedValue({ type: 'text' as const, value: 'formatted body' }),
      getBoundedTools: jest.fn().mockResolvedValue([
        {
          id: 'bounded-1',
          type: ToolType.builtin,
          description: 'Bounded tool',
          readonly: true,
          configuration: {},
          schema: {},
          handler: jest.fn(),
        },
      ]),
    });
    const tool = createSmlReadTool(smlToolOptions);
    const result = (await tool.handler(
      { chunk_ids: ['chunk-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.other);
    const data = (
      result.results[0] as OtherResult<{
        format: { type: string; value: string };
        bounded_tools: Array<{ id: string }>;
      }>
    ).data;
    expect(data.format).toEqual({ type: 'text', value: 'formatted body' });
    expect(data.bounded_tools).toEqual([
      { id: 'bounded-1', type: ToolType.builtin, description: 'Bounded tool' },
    ]);
  });
});
