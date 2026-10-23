/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolOrigin, ToolType } from '@kbn/agent-builder-common';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition, SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { createToolHandlerContextMock, type ToolHandlerContextMock } from '../../test_utils/runner';
import { loadSkillTools, MAX_SKILL_REGISTRY_TOOLS } from './load_skill_tools';

const createMockSkill = (
  overrides: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id: 'test-skill',
  name: 'my-skill',
  description: 'A test skill',
  content: 'skill content',
  readonly: true,
  basePath: 'skills/platform',
  getRegistryTools: jest.fn().mockReturnValue([]),
  getInlineTools: jest.fn().mockReturnValue([]),
  referencedContentCount: 0,
  experimental: false,
  ...overrides,
});

describe('loadSkillTools', () => {
  let ctx: ToolHandlerContextMock;

  beforeEach(() => {
    ctx = createToolHandlerContextMock();
  });

  it('returns the ids of the loaded tools, inline first then registry', async () => {
    const inlineTool = { id: 'inline-1', type: ToolType.builtin } as SkillBoundedTool;
    const convertedInline = { id: 'inline-1' } as any;
    const registryTool = { id: 'registry-1' } as any;

    const skill = createMockSkill({
      getInlineTools: jest.fn().mockReturnValue([inlineTool]),
      getRegistryTools: jest.fn().mockReturnValue(['registry-1']),
    });

    ctx.skills.convertSkillTool.mockReturnValue(convertedInline);
    ctx.toolProvider.list.mockResolvedValue([registryTool]);

    const result = await loadSkillTools({
      skill,
      skillsService: ctx.skills,
      toolProvider: ctx.toolProvider,
      request: ctx.request,
      toolManager: ctx.toolManager,
      logger: ctx.logger,
      runContext: ctx.runContext,
    });

    expect(result).toEqual({ loadedToolIds: ['inline-1', 'registry-1'], dynamicTools: [] });
    expect(ctx.toolManager.addTools).toHaveBeenCalledTimes(1);
    expect(ctx.toolManager.addTools).toHaveBeenCalledWith(
      {
        type: ToolManagerToolType.executable,
        tools: [
          { ...convertedInline, origin: ToolOrigin.inline },
          { ...registryTool, origin: ToolOrigin.registry },
        ],
        logger: ctx.logger,
      },
      { dynamic: true }
    );
  });

  it(`throws when the skill exceeds the ${MAX_SKILL_REGISTRY_TOOLS}-tool registry limit`, async () => {
    const tooMany = Array.from({ length: MAX_SKILL_REGISTRY_TOOLS + 1 }, (_, i) => `t-${i}`);
    const skill = createMockSkill({
      getRegistryTools: jest.fn().mockReturnValue(tooMany),
    });

    await expect(
      loadSkillTools({
        skill,
        skillsService: ctx.skills,
        toolProvider: ctx.toolProvider,
        request: ctx.request,
        toolManager: ctx.toolManager,
        logger: ctx.logger,
        runContext: ctx.runContext,
      })
    ).rejects.toThrow(/exceeding the 25-tool limit/);
    expect(ctx.toolManager.addTools).not.toHaveBeenCalled();
  });

  it('handles a skill with no getInlineTools method', async () => {
    const skill = createMockSkill({
      getInlineTools: undefined,
      getRegistryTools: jest.fn().mockReturnValue([]),
    });

    const result = await loadSkillTools({
      skill,
      skillsService: ctx.skills,
      toolProvider: ctx.toolProvider,
      request: ctx.request,
      toolManager: ctx.toolManager,
      logger: ctx.logger,
      runContext: ctx.runContext,
    });

    expect(result).toEqual({ loadedToolIds: [], dynamicTools: [] });
    expect(ctx.toolManager.addTools).toHaveBeenCalledWith(expect.objectContaining({ tools: [] }), {
      dynamic: true,
    });
  });

  describe('with dynamic tools enabled', () => {
    const inlineSchema = z.object({ query: z.string().describe('What to search for') });
    const registrySchema = z.object({ id: z.number() });

    const inlineTool = { id: 'inline-1', type: ToolType.builtin } as SkillBoundedTool;
    const convertedInline = {
      id: 'inline-1',
      description: 'Inline tool',
      getSchema: () => inlineSchema,
    } as any;
    const registryTool = {
      id: 'registry-1',
      description: 'Registry tool',
      getSchema: () => registrySchema,
    } as any;

    let skill: InternalSkillDefinition;

    const dynamicToolsInput = {
      type: ToolManagerToolType.dynamic,
      tools: [
        { ...convertedInline, origin: ToolOrigin.inline },
        { ...registryTool, origin: ToolOrigin.registry },
      ],
    };

    beforeEach(() => {
      skill = createMockSkill({
        getInlineTools: jest.fn().mockReturnValue([inlineTool]),
        getRegistryTools: jest.fn().mockReturnValue(['registry-1']),
      });
      ctx.skills.convertSkillTool.mockReturnValue(convertedInline);
      ctx.toolProvider.list.mockResolvedValue([registryTool]);
    });

    const load = () =>
      loadSkillTools({
        skill,
        skillsService: ctx.skills,
        toolProvider: ctx.toolProvider,
        request: ctx.request,
        toolManager: ctx.toolManager,
        logger: ctx.logger,
        runContext: ctx.runContext,
        dynamicToolsEnabled: true,
      });

    it('registers the tools as dynamic tools instead of binding them', async () => {
      const result = await load();

      expect(ctx.toolManager.addTools).toHaveBeenCalledTimes(1);
      expect(ctx.toolManager.addTools).toHaveBeenCalledWith(dynamicToolsInput);
      expect(result.loadedToolIds).toEqual(['inline-1', 'registry-1']);
      expect(result.dynamicTools).toEqual([
        {
          tool_id: 'inline-1',
          description: 'Inline tool',
          parameters: expect.objectContaining({
            type: 'object',
            properties: {
              query: expect.objectContaining({ type: 'string', description: 'What to search for' }),
            },
            required: ['query'],
          }),
        },
        {
          tool_id: 'registry-1',
          description: 'Registry tool',
          parameters: expect.objectContaining({
            properties: { id: expect.objectContaining({ type: 'number' }) },
          }),
        },
      ]);
    });

    it('still reports the full tool count to telemetry', async () => {
      const analyticsService = { reportSkillInvoked: jest.fn() } as any;

      await loadSkillTools({
        skill,
        skillsService: ctx.skills,
        toolProvider: ctx.toolProvider,
        request: ctx.request,
        toolManager: ctx.toolManager,
        logger: ctx.logger,
        runContext: ctx.runContext,
        dynamicToolsEnabled: true,
        analyticsService,
      });

      expect(analyticsService.reportSkillInvoked).toHaveBeenCalledWith(
        expect.objectContaining({ skillId: 'test-skill', toolCount: 2 })
      );
    });
  });
});
