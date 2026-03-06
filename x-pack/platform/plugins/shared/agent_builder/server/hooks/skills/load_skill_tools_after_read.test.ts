/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterToolCallHookContext } from '@kbn/agent-builder-server';
import { filestoreTools } from '@kbn/agent-builder-common/tools';
import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import type {
  SkillFileEntry,
  SkillReferencedContentFileEntry,
} from '../../services/runner/store/volumes/skills/types';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { ToolManagerToolType } from '@kbn/agent-builder-server/runner';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ToolType } from '@kbn/agent-builder-common';
import { createToolHandlerContextMock, type ToolHandlerContextMock } from '../../test_utils/runner';
import { loadSkillToolsAfterRead } from './load_skill_tools_after_read';

const createSkillFileEntry = (
  overrides: Partial<{ path: string; skillId: string }> = {}
): SkillFileEntry => ({
  path: overrides.path ?? 'skills/platform/my-skill/SKILL.md',
  type: 'file',
  metadata: {
    type: FileEntryType.skill,
    id: overrides.skillId ?? 'test-skill',
    token_count: 100,
    readonly: true,
    skill_name: 'my-skill',
    skill_description: 'A test skill',
    skill_id: overrides.skillId ?? 'test-skill',
  },
  content: {
    raw: { body: 'skill content' },
    plain_text: 'skill content',
  },
});

const createNonSkillFileEntry = (): FileEntry => ({
  path: 'results/some-tool/output.json',
  type: 'file',
  metadata: {
    type: FileEntryType.toolResult,
    id: 'result-1',
    token_count: 50,
    readonly: true,
  },
  content: {
    raw: { data: 'some result' },
    plain_text: 'some result',
  },
});

const createMockSkill = (
  overrides: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id: 'test-skill',
  name: 'my-skill',
  description: 'A test skill',
  content: 'skill content',
  readonly: true,
  getRegistryTools: jest.fn().mockReturnValue([]),
  getInlineTools: jest.fn().mockReturnValue([]),
  ...overrides,
});

const createHookContext = ({
  toolId = filestoreTools.read,
  toolParams = { path: 'skills/platform/my-skill/SKILL.md' },
  toolHandlerContext,
}: {
  toolId?: string;
  toolParams?: Record<string, unknown>;
  toolHandlerContext: ToolHandlerContextMock;
}): AfterToolCallHookContext => ({
  toolId,
  toolCallId: 'call-1',
  toolParams,
  source: 'agent',
  request: toolHandlerContext.request,
  toolReturn: { results: [] },
  toolHandlerContext,
});

describe('loadSkillToolsAfterRead', () => {
  let toolHandlerContext: ToolHandlerContextMock;

  beforeEach(() => {
    toolHandlerContext = createToolHandlerContextMock();
  });

  describe('early exits', () => {
    it('does nothing when toolId is not the read tool', async () => {
      const context = createHookContext({
        toolId: 'some-other-tool',
        toolHandlerContext,
      });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.filestore.read).not.toHaveBeenCalled();
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });

    it('does nothing when path param is missing', async () => {
      const context = createHookContext({
        toolParams: {},
        toolHandlerContext,
      });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.filestore.read).not.toHaveBeenCalled();
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });

    it('does nothing when filestore returns no entry for the path', async () => {
      toolHandlerContext.filestore.read.mockResolvedValue(undefined);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.filestore.read).toHaveBeenCalledWith(
        'skills/platform/my-skill/SKILL.md'
      );
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });

    it('does nothing when the file entry is not a skill file', async () => {
      toolHandlerContext.filestore.read.mockResolvedValue(createNonSkillFileEntry());

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });

    it('logs a warning and does not add tools when skill is not found in registry', async () => {
      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(undefined);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.skills.get).toHaveBeenCalledWith('test-skill');
      expect(toolHandlerContext.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Skill 'test-skill' not found in registry")
      );
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });
  });

  describe('skill tool loading', () => {
    it('loads inline tools as dynamic tools into the tool manager', async () => {
      const inlineTool = { id: 'inline-1', type: ToolType.builtin } as SkillBoundedTool;
      const convertedTool = { id: 'inline-1-converted' } as any;

      const skill = createMockSkill({
        getInlineTools: jest.fn().mockReturnValue([inlineTool]),
        getRegistryTools: jest.fn().mockReturnValue([]),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);
      toolHandlerContext.skills.convertSkillTool.mockReturnValue(convertedTool);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(skill.getInlineTools).toHaveBeenCalled();
      expect(toolHandlerContext.skills.convertSkillTool).toHaveBeenCalledWith(inlineTool);
      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalledWith(
        {
          type: ToolManagerToolType.executable,
          tools: [convertedTool],
          logger: toolHandlerContext.logger,
        },
        { dynamic: true }
      );
    });

    it('loads registry tools as dynamic tools into the tool manager', async () => {
      const registryTool = { id: 'registry-tool-1' } as any;
      const skill = createMockSkill({
        getInlineTools: jest.fn().mockReturnValue([]),
        getRegistryTools: jest.fn().mockReturnValue(['registry-tool-1']),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);
      toolHandlerContext.toolProvider.list.mockResolvedValue([registryTool]);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(skill.getRegistryTools).toHaveBeenCalled();
      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ToolManagerToolType.executable,
          tools: expect.arrayContaining([registryTool]),
        }),
        { dynamic: true }
      );
    });

    it('loads both inline and registry tools together', async () => {
      const inlineTool = { id: 'inline-1', type: ToolType.builtin } as SkillBoundedTool;
      const convertedInline = { id: 'inline-1-converted' } as any;
      const registryTool = { id: 'registry-1' } as any;

      const skill = createMockSkill({
        getInlineTools: jest.fn().mockReturnValue([inlineTool]),
        getRegistryTools: jest.fn().mockReturnValue(['registry-1']),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);
      toolHandlerContext.skills.convertSkillTool.mockReturnValue(convertedInline);
      toolHandlerContext.toolProvider.list.mockResolvedValue([registryTool]);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalledWith(
        {
          type: ToolManagerToolType.executable,
          tools: [convertedInline, registryTool],
          logger: toolHandlerContext.logger,
        },
        { dynamic: true }
      );
    });

    it('handles skills with no getInlineTools method', async () => {
      const skill = createMockSkill({
        getInlineTools: undefined,
        getRegistryTools: jest.fn().mockReturnValue([]),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalledWith(
        {
          type: ToolManagerToolType.executable,
          tools: [],
          logger: toolHandlerContext.logger,
        },
        { dynamic: true }
      );
    });

    it('adds tools as dynamic (not static)', async () => {
      const skill = createMockSkill();

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalledWith(expect.any(Object), {
        dynamic: true,
      });
    });

    it('uses the skill_id from file entry metadata to look up the skill', async () => {
      const skill = createMockSkill({ id: 'custom-skill-id' });

      toolHandlerContext.filestore.read.mockResolvedValue(
        createSkillFileEntry({ skillId: 'custom-skill-id' })
      );
      toolHandlerContext.skills.get.mockResolvedValue(skill);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.skills.get).toHaveBeenCalledWith('custom-skill-id');
    });
  });

  describe('registry tools limit', () => {
    it('throws when a skill returns more than 25 registry tools', async () => {
      const tooManyToolIds = Array.from({ length: 26 }, (_, i) => `tool-${i}`);
      const skill = createMockSkill({
        getRegistryTools: jest.fn().mockReturnValue(tooManyToolIds),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);

      const context = createHookContext({ toolHandlerContext });

      await expect(loadSkillToolsAfterRead(context)).rejects.toThrow(
        /returned 26 registry tools, exceeding the 25-tool limit/
      );
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });

    it('does not throw when a skill returns exactly 25 registry tools', async () => {
      const toolIds = Array.from({ length: 25 }, (_, i) => `tool-${i}`);
      const skill = createMockSkill({
        getRegistryTools: jest.fn().mockReturnValue(toolIds),
      });

      toolHandlerContext.filestore.read.mockResolvedValue(createSkillFileEntry());
      toolHandlerContext.skills.get.mockResolvedValue(skill);
      toolHandlerContext.toolProvider.list.mockResolvedValue(toolIds.map((id) => ({ id } as any)));

      const context = createHookContext({ toolHandlerContext });

      await expect(loadSkillToolsAfterRead(context)).resolves.not.toThrow();
      expect(toolHandlerContext.toolManager.addTools).toHaveBeenCalled();
    });
  });

  describe('skill_reference_content entries', () => {
    it('does not trigger tool loading for skill reference content entries', async () => {
      const refContentEntry: SkillReferencedContentFileEntry = {
        path: 'skills/platform/my-skill/ref/content.md',
        type: 'file',
        metadata: {
          type: FileEntryType.skillReferenceContent,
          id: 'test-skill',
          token_count: 50,
          readonly: true,
          skill_id: 'test-skill',
        },
        content: {
          raw: { body: 'reference content' },
          plain_text: 'reference content',
        },
      };

      toolHandlerContext.filestore.read.mockResolvedValue(refContentEntry);

      const context = createHookContext({ toolHandlerContext });

      await loadSkillToolsAfterRead(context);

      expect(toolHandlerContext.skills.get).not.toHaveBeenCalled();
      expect(toolHandlerContext.toolManager.addTools).not.toHaveBeenCalled();
    });
  });
});
