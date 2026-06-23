/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { TOOL_ATTACHMENT_TYPE } from '../../../common/attachments';
import { createToolAttachmentType } from '../../attachment_types/tool';
import { createProposeToolTool } from './propose_tool';
import { createPatchToolTool } from './patch_tool';

/**
 * Stub of `ToolProvider.list` matching the surface skill_authoring tests use.
 * We project enough fields for the duplicate-id check and the projection.
 */
const stubToolProvider = (registry: Array<{ id: string; description?: string }>) => ({
  list: jest.fn(async () =>
    registry.map((t) => ({
      id: t.id,
      description: t.description ?? `Description for ${t.id}`,
      type: 'builtin',
      tags: [],
      readonly: true,
      experimental: false,
      configuration: {},
      getSchema: async () => ({} as any),
      execute: async () => ({} as any),
    }))
  ),
  has: jest.fn(),
  get: jest.fn(),
});

const createTestContext = (
  registry: Array<{ id: string; description?: string }> = []
): {
  context: ToolHandlerContext;
  attachments: ReturnType<typeof createAttachmentStateManager>;
} => {
  const toolAttachmentType = createToolAttachmentType();
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === TOOL_ATTACHMENT_TYPE ? (toolAttachmentType as AttachmentTypeDefinition) : undefined,
  });

  const context = {
    attachments,
    toolProvider: stubToolProvider(registry),
    request: {},
  } as unknown as ToolHandlerContext;

  return { context, attachments };
};

const validProposeInput = {
  id: 'logs.top_error_counts',
  type: ToolType.esql as const,
  description:
    'Use when the user asks for the most frequent error message types in a logs-* index over a recent time window.',
  configuration: {
    query:
      'FROM logs-* | WHERE log.level == "ERROR" AND @timestamp >= ?since | STATS count = COUNT(*) BY message | SORT count DESC | LIMIT ?top_n',
    params: {
      since: {
        type: 'date' as const,
        description: 'Lookback window as an ES|QL relative time expression.',
        optional: true,
        defaultValue: 'now-24h',
      },
      top_n: {
        type: 'integer' as const,
        description: 'Maximum number of message types to return.',
        optional: true,
        defaultValue: 10,
      },
    },
  },
};

describe('propose_tool tool', () => {
  it('creates a tool attachment with version 1 and returns its id', async () => {
    const tool = createProposeToolTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(validProposeInput, context)) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);

    const data = result.results[0].data as {
      attachment_id: string;
      version: number;
      tool_id: string;
      param_count: number;
    };
    expect(data.tool_id).toBe('logs.top_error_counts');
    expect(data.version).toBe(1);
    expect(data.param_count).toBe(2);

    const stored = attachments.get(data.attachment_id);
    expect(stored?.type).toBe(TOOL_ATTACHMENT_TYPE);
    expect((stored?.data.data as { id: string }).id).toBe('logs.top_error_counts');
  });

  it('rejects an invalid tool id', async () => {
    const tool = createProposeToolTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(
      { ...validProposeInput, id: 'Has-Uppercase' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('rejects a duplicate tool id', async () => {
    const tool = createProposeToolTool();
    const { context, attachments } = createTestContext([
      { id: 'logs.top_error_counts', description: 'pre-existing' },
    ]);

    const result = (await tool.handler(validProposeInput, context)) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('rejects a query that references undefined parameters', async () => {
    const tool = createProposeToolTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(
      {
        ...validProposeInput,
        configuration: {
          query: 'FROM logs-* | WHERE severity == ?severity | LIMIT 10',
          params: {},
        },
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toMatch(/severity/);
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('rejects defined params that are not referenced by the query', async () => {
    const tool = createProposeToolTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(
      {
        ...validProposeInput,
        configuration: {
          query: 'FROM logs-* | LIMIT 10',
          params: {
            unused: {
              type: 'string',
              description: 'unused',
            },
          },
        },
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect((result.results[0].data as { message: string }).message).toMatch(/unused/);
    expect(attachments.getActive()).toHaveLength(0);
  });
});

describe('patch_tool tool', () => {
  const seedDraft = async () => {
    const { context, attachments } = createTestContext();
    const proposeResult = (await createProposeToolTool().handler(
      validProposeInput,
      context
    )) as ToolHandlerStandardReturn;
    const proposeData = proposeResult.results[0].data as { attachment_id: string };
    return { context, attachments, attachmentId: proposeData.attachment_id };
  };

  it('updates the description and bumps the version', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const result = (await createPatchToolTool().handler(
      {
        attachment_id: attachmentId,
        description: 'Updated description for the top error counts tool.',
      },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as { version: number };
    expect(data.version).toBe(2);
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { description: string }).description).toMatch(/Updated/);
  });

  it('applies a search-replace patch to the query', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const result = (await createPatchToolTool().handler(
      {
        attachment_id: attachmentId,
        query_patches: [
          { find: 'log.level == "ERROR"', replace: 'log.level IN ("ERROR", "FATAL")' },
        ],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const stored = attachments.get(attachmentId);
    expect(
      (stored?.data.data as { configuration: { query: string } }).configuration.query
    ).toContain('IN ("ERROR", "FATAL")');
  });

  it('renames a parameter via query patch + params_to_add/remove', async () => {
    const { context, attachments, attachmentId } = await seedDraft();

    const result = (await createPatchToolTool().handler(
      {
        attachment_id: attachmentId,
        query_patches: [{ find: 'LIMIT ?top_n', replace: 'LIMIT ?limit' }],
        params_to_remove: ['top_n'],
        params_to_add: {
          limit: {
            type: 'integer',
            description: 'Max rows returned.',
            optional: true,
            defaultValue: 10,
          },
        },
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const stored = attachments.get(attachmentId);
    const config = (
      stored?.data.data as { configuration: { query: string; params: Record<string, unknown> } }
    ).configuration;
    expect(config.query).toContain('LIMIT ?limit');
    expect(config.params).toHaveProperty('limit');
    expect(config.params).not.toHaveProperty('top_n');
  });

  it('returns an error and leaves state unchanged when a query patch text is missing', async () => {
    const { context, attachments, attachmentId } = await seedDraft();
    const before = attachments.get(attachmentId);

    const result = (await createPatchToolTool().handler(
      {
        attachment_id: attachmentId,
        query_patches: [{ find: 'this string is not in the query', replace: 'x' }],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const after = attachments.get(attachmentId);
    expect(after?.version).toBe(before?.version);
  });

  it('returns an error when the attachment id is unknown', async () => {
    const { context } = createTestContext();
    const result = (await createPatchToolTool().handler(
      { attachment_id: 'does-not-exist', description: 'new' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
  });

  it('rejects params_to_remove for a parameter that does not exist', async () => {
    const { context, attachments, attachmentId } = await seedDraft();
    const before = attachments.get(attachmentId);

    const result = (await createPatchToolTool().handler(
      { attachment_id: attachmentId, params_to_remove: ['ghost'] },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.get(attachmentId)?.version).toBe(before?.version);
  });

  it('rejects removing a param that the query still references', async () => {
    const { context, attachments, attachmentId } = await seedDraft();
    const before = attachments.get(attachmentId);

    const result = (await createPatchToolTool().handler(
      { attachment_id: attachmentId, params_to_remove: ['top_n'] },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.get(attachmentId)?.version).toBe(before?.version);
  });
});
