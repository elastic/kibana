/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { SKILL_ATTACHMENT_TYPE } from '../../../common/attachments';
import { createSkillAttachmentType } from '../../attachment_types/skill';
import { createListToolsTool } from './list_tools';
import { createProposeSkillTool } from './propose_skill';
import { createPatchSkillTool } from './patch_skill';

/**
 * Stub of `ToolProvider.list` that returns the configured tools as if they
 * were the live registry. We only care about the fields the code under test
 * actually reads (id, description, type, tags); the rest of the
 * `ExecutableTool` surface is filled with no-op values to satisfy the type.
 */
const stubToolProvider = (
  registry: Array<{ id: string; description?: string; type?: string; tags?: string[] }>
) => ({
  list: jest.fn(async () =>
    registry.map((t) => ({
      id: t.id,
      description: t.description ?? `Description for ${t.id}`,
      type: t.type ?? 'builtin',
      tags: t.tags ?? [],
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

/**
 * Default registry used by tests that don't care about the exact tool set.
 * Includes `platform.core.execute_esql` so the existing propose/patch happy
 * paths (which pass that id) continue to pass without per-test wiring.
 */
const DEFAULT_REGISTRY: Array<{ id: string; description?: string }> = [
  { id: 'platform.core.execute_esql', description: 'Run an ES|QL query.' },
];

/**
 * Build a minimal `ToolHandlerContext` carrying a real `AttachmentStateManager`
 * and a stubbed `ToolProvider`. We exercise the actual attachment validation
 * pipeline (the same one the production runner uses) so the tests catch any
 * drift between the tool's pre-flight Zod check and the attachment type's
 * `validate`.
 */
const createTestContext = (
  registry: Array<{ id: string; description?: string }> = DEFAULT_REGISTRY
): {
  context: ToolHandlerContext;
  attachments: ReturnType<typeof createAttachmentStateManager>;
} => {
  const skillAttachmentType = createSkillAttachmentType();
  const attachments = createAttachmentStateManager([], {
    getTypeDefinition: (type) =>
      type === SKILL_ATTACHMENT_TYPE
        ? (skillAttachmentType as AttachmentTypeDefinition)
        : undefined,
  });

  const context = {
    attachments,
    toolProvider: stubToolProvider(registry),
    request: {},
  } as unknown as ToolHandlerContext;

  return { context, attachments };
};

const validProposeInput = {
  id: 'incident-triage',
  name: 'Incident triage',
  description: 'Use when investigating production incidents.',
  content: '## When to Use\n\nUse this skill when triaging incidents.',
  tool_ids: ['platform.core.execute_esql'],
};

describe('list_tools tool', () => {
  it('returns the registry projection with id and description only', async () => {
    const tool = createListToolsTool();
    const { context } = createTestContext([
      { id: 'tool.a', description: 'First tool' },
      { id: 'tool.b', description: 'Second tool' },
    ]);

    const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);

    const data = result.results[0].data as {
      tools: Array<Record<string, unknown>>;
      total: number;
    };
    expect(data.tools).toHaveLength(2);
    expect(data.tools[0]).toEqual({ id: 'tool.a', description: 'First tool' });
    expect(data.tools[1]).toEqual({ id: 'tool.b', description: 'Second tool' });
    expect(data.total).toBe(2);
  });

  it('returns an empty list cleanly when the registry has no tools', async () => {
    const tool = createListToolsTool();
    const { context } = createTestContext([]);

    const result = (await tool.handler({}, context)) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const data = result.results[0].data as { tools: unknown[]; total: number };
    expect(data.tools).toHaveLength(0);
    expect(data.total).toBe(0);
  });
});

describe('propose_skill tool', () => {
  it('creates a skill attachment with version 1 and returns its id', async () => {
    const tool = createProposeSkillTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(validProposeInput, context)) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    const [first] = result.results;
    expect(first.type).toBe(ToolResultType.other);

    const data = first.data as { attachment_id: string; version: number; skill_id: string };
    expect(data.skill_id).toBe('incident-triage');
    expect(data.version).toBe(1);

    const stored = attachments.get(data.attachment_id);
    expect(stored?.type).toBe(SKILL_ATTACHMENT_TYPE);
    expect(stored?.data.data).toMatchObject({
      id: 'incident-triage',
      tool_ids: ['platform.core.execute_esql'],
    });
  });

  it('returns an error result when the draft fails schema validation', async () => {
    const tool = createProposeSkillTool();
    const { context, attachments } = createTestContext();

    const result = (await tool.handler(
      { ...validProposeInput, id: 'Has-Uppercase' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('rejects an unknown tool_id and returns the available_tools list for recovery', async () => {
    const tool = createProposeSkillTool();
    const { context, attachments } = createTestContext([
      { id: 'real.tool.alpha', description: 'Alpha' },
      { id: 'real.tool.beta', description: 'Beta' },
    ]);

    const result = (await tool.handler(
      { ...validProposeInput, tool_ids: ['hallucinated.tool'] },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(2);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[1].type).toBe(ToolResultType.other);

    const recovery = result.results[1].data as {
      invalid_tool_ids: string[];
      available_tools: Array<{ id: string }>;
    };
    expect(recovery.invalid_tool_ids).toEqual(['hallucinated.tool']);
    expect(recovery.available_tools.map((t) => t.id)).toEqual([
      'real.tool.alpha',
      'real.tool.beta',
    ]);

    // Nothing should have been persisted.
    expect(attachments.getActive()).toHaveLength(0);
  });

  it('accepts an empty tool_ids array without hitting the registry', async () => {
    const tool = createProposeSkillTool();
    // Empty registry — call would fail if the validator hit it, but with an
    // empty tool_ids list we short-circuit and skip the registry call.
    const { context, attachments } = createTestContext([]);

    const result = (await tool.handler(
      { ...validProposeInput, tool_ids: [] },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(1);
    expect(result.results[0].type).toBe(ToolResultType.other);
    expect(attachments.getActive()).toHaveLength(1);
  });
});

describe('patch_skill tool', () => {
  const seedSkill = async () => {
    const { context, attachments } = createTestContext();
    const proposeResult = (await createProposeSkillTool().handler(
      validProposeInput,
      context
    )) as ToolHandlerStandardReturn;
    const proposeData = proposeResult.results[0].data as { attachment_id: string };
    return { context, attachments, attachmentId: proposeData.attachment_id };
  };

  it('renames the draft and bumps the version', async () => {
    const { context, attachments, attachmentId } = await seedSkill();

    const result = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        name: 'Incident triage v2',
      },
      context
    )) as ToolHandlerStandardReturn;

    const data = result.results[0].data as { version: number };
    expect(data.version).toBe(2);
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { name: string }).name).toBe('Incident triage v2');
  });

  it('applies a search-replace patch to content', async () => {
    const { context, attachments, attachmentId } = await seedSkill();

    const result = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        content_patches: [
          {
            find: 'triaging incidents',
            replace: 'triaging production incidents quickly',
          },
        ],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.other);
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { content: string }).content).toContain(
      'triaging production incidents quickly'
    );
  });

  it('returns an error and does not mutate state when a patch text is missing', async () => {
    const { context, attachments, attachmentId } = await seedSkill();
    const before = attachments.get(attachmentId);

    const result = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        content_patches: [{ find: 'this string is not in the content', replace: 'x' }],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
    const after = attachments.get(attachmentId);
    expect(after?.version).toBe(before?.version);
  });

  it('returns an error when the attachment id is unknown', async () => {
    const { context } = createTestContext();
    const result = (await createPatchSkillTool().handler(
      { attachment_id: 'does-not-exist', name: 'New name' },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results[0].type).toBe(ToolResultType.error);
  });

  it('adds and removes referenced files', async () => {
    const { context, attachments, attachmentId } = await seedSkill();

    const addResult = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        referenced_files_to_add: [
          { name: 'examples', relativePath: './examples', content: '# Examples\n' },
        ],
      },
      context
    )) as ToolHandlerStandardReturn;
    expect(addResult.results[0].type).toBe(ToolResultType.other);

    const stored = attachments.get(attachmentId);
    expect(
      (stored?.data.data as { referenced_content?: Array<{ name: string }> }).referenced_content
    ).toHaveLength(1);

    const removeResult = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        referenced_files_to_remove: [{ name: 'examples', relativePath: './examples' }],
      },
      context
    )) as ToolHandlerStandardReturn;
    expect(removeResult.results[0].type).toBe(ToolResultType.other);

    const finalStored = attachments.get(attachmentId);
    expect(
      (finalStored?.data.data as { referenced_content?: unknown[] }).referenced_content?.length ?? 0
    ).toBe(0);
  });

  it('rejects a patch that introduces an unknown tool_id and leaves the draft unchanged', async () => {
    const { context, attachments, attachmentId } = await seedSkill();

    const result = (await createPatchSkillTool().handler(
      {
        attachment_id: attachmentId,
        tool_ids: ['hallucinated.tool'],
      },
      context
    )) as ToolHandlerStandardReturn;

    expect(result.results).toHaveLength(2);
    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[1].type).toBe(ToolResultType.other);

    const recovery = result.results[1].data as {
      invalid_tool_ids: string[];
      available_tools: Array<{ id: string }>;
    };
    expect(recovery.invalid_tool_ids).toEqual(['hallucinated.tool']);
    expect(recovery.available_tools.map((t) => t.id)).toContain('platform.core.execute_esql');

    // The draft's tool_ids should be untouched.
    const stored = attachments.get(attachmentId);
    expect((stored?.data.data as { tool_ids: string[] }).tool_ids).toEqual([
      'platform.core.execute_esql',
    ]);
  });
});
