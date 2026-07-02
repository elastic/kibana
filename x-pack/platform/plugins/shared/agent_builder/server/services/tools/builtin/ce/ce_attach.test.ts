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
import type { ToolAvailabilityContext } from '@kbn/agent-builder-server';
import {
  AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import { createCeAttachTool } from './ce_attach';

const buildAvailabilityContext = (flags: Record<string, boolean>) =>
  ({
    uiSettings: {
      get: jest.fn(async (key: string) => flags[key]),
    },
  } as unknown as ToolAvailabilityContext);

const mockResolveCeAttachItems = jest.fn();
const mockAttachmentsAdd = jest.fn();

const getContextEngine = jest.fn(() => ({
  search: jest.fn(),
  indexAttachment: jest.fn(),
  deleteAttachment: jest.fn(),
  getDocuments: jest.fn(),
  getTypeDefinition: jest.fn(),
  resolveCeAttachItems: mockResolveCeAttachItems,
}));

const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() };

const mockContext = {
  spaceId: 'default',
  esClient: { asCurrentUser: {}, asInternalUser: {} },
  request: {},
  savedObjectsClient: {},
  attachments: { add: mockAttachmentsAdd },
  logger: mockLogger,
};

describe('createCeAttachTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct id and tags', () => {
    const tool = createCeAttachTool({ getContextEngine });
    expect(tool.id).toBe(platformCoreTools.ceAttach);
    expect(tool.type).toBe(ToolType.builtin);
    expect(tool.tags).toEqual(['ce', 'attachment']);
  });

  describe('availability', () => {
    it('is available only when both experimental features and the Context Engine are enabled', async () => {
      const tool = createCeAttachTool({ getContextEngine });
      const result = await tool.availability!.handler(
        buildAvailabilityContext({
          [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
          [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
        })
      );
      expect(result.status).toBe('available');
    });

    it('is unavailable when experimental features are disabled', async () => {
      const tool = createCeAttachTool({ getContextEngine });
      const result = await tool.availability!.handler(
        buildAvailabilityContext({
          [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: false,
          [CONTEXT_ENGINE_ENABLED_SETTING_ID]: true,
        })
      );
      expect(result.status).toBe('unavailable');
    });

    it('is unavailable when the Context Engine is disabled', async () => {
      const tool = createCeAttachTool({ getContextEngine });
      const result = await tool.availability!.handler(
        buildAvailabilityContext({
          [AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID]: true,
          [CONTEXT_ENGINE_ENABLED_SETTING_ID]: false,
        })
      );
      expect(result.status).toBe('unavailable');
    });
  });

  it('returns error result when resolveCeAttachItems reports access denied', async () => {
    mockResolveCeAttachItems.mockResolvedValue([
      {
        success: false,
        entry_id: 'entry-1',
        message: 'Access denied: you do not have the required permissions',
      },
    ]);
    const tool = createCeAttachTool({ getContextEngine });
    const result = (await tool.handler(
      { entry_ids: ['entry-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('Access denied');
  });

  it('returns error result when resolveCeAttachItems reports document not found', async () => {
    mockResolveCeAttachItems.mockResolvedValue([
      {
        success: false,
        entry_id: 'entry-1',
        message: "CE document 'entry-1' not found in the index",
      },
    ]);
    const tool = createCeAttachTool({ getContextEngine });
    const result = (await tool.handler(
      { entry_ids: ['entry-1'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(1);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[0] as ErrorResult).data.message).toContain('not found in the index');
  });

  it('returns success when resolveCeAttachItems returns attachment and add succeeds', async () => {
    mockResolveCeAttachItems.mockResolvedValue([
      {
        success: true,
        entry_id: 'entry-1',
        attachment: {
          type: 'visualization',
          data: { layers: [] },
          origin: 'ref-1',
          description: 'visualization/Test',
        },
      },
    ]);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-123' });
    const tool = createCeAttachTool({ getContextEngine });
    const result = (await tool.handler(
      { entry_ids: ['entry-1'] },
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
  });

  it('handles multiple items with mix of success and failure', async () => {
    mockResolveCeAttachItems.mockResolvedValue([
      { success: false, entry_id: 'denied-entry', message: 'Access denied' },
      {
        success: true,
        entry_id: 'ok-entry',
        attachment: { type: 'visualization', data: {}, origin: 'ref-2', description: 'vis/Test' },
      },
    ]);
    mockAttachmentsAdd.mockResolvedValue({ id: 'att-456' });
    const tool = createCeAttachTool({ getContextEngine });
    const result = (await tool.handler(
      { entry_ids: ['denied-entry', 'ok-entry'] },
      mockContext as unknown as ToolHandlerContext
    )) as { results: unknown[] };
    expect(result.results).toHaveLength(2);
    expect((result.results[0] as { type: string }).type).toBe(ToolResultType.error);
    expect((result.results[1] as { type: string }).type).toBe(ToolResultType.other);
  });

  it('calls resolveCeAttachItems with correct params', async () => {
    mockResolveCeAttachItems.mockResolvedValue([]);
    const tool = createCeAttachTool({ getContextEngine });
    await tool.handler(
      { entry_ids: ['entry-a', 'entry-b'] },
      mockContext as unknown as ToolHandlerContext
    );
    expect(mockResolveCeAttachItems).toHaveBeenCalledWith({
      entryIds: ['entry-a', 'entry-b'],
      esClient: mockContext.esClient,
      request: mockContext.request,
      spaceId: 'default',
      savedObjectsClient: mockContext.savedObjectsClient,
      logger: mockLogger,
    });
  });
});
