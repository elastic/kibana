/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { createSkillRegistry } from './skill_registry';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';

const createMockInternalSkillDefinition = (
  overrides: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id: 'test-skill-1',
  name: 'test-skill',
  description: 'A test skill',
  content: 'Skill body content',
  readonly: true,
  basePath: 'skills/platform',
  getRegistryTools: () => [],
  referencedContentCount: 0,
  ...overrides,
});

const createMockBuiltinProvider = (
  skills: InternalSkillDefinition[]
): jest.Mocked<ReadonlySkillProvider> => {
  const skillsMap = new Map(skills.map((s) => [s.id, s]));
  return {
    id: 'builtin',
    readonly: true,
    has: jest.fn(async (id: string) => skillsMap.has(id)),
    get: jest.fn(async (id: string) => skillsMap.get(id)),
    bulkGet: jest.fn(async (ids: string[]) => {
      const result = new Map<string, InternalSkillDefinition>();
      for (const id of ids) {
        const skill = skillsMap.get(id);
        if (skill) result.set(id, skill);
      }
      return result;
    }),
    list: jest.fn(async () => skills),
  };
};

const createMockPersistedProvider = (
  skills: InternalSkillDefinition[]
): jest.Mocked<WritableSkillProvider> => {
  const skillsMap = new Map(skills.map((s) => [s.id, s]));
  return {
    id: 'persisted',
    readonly: false,
    has: jest.fn(async (id: string) => skillsMap.has(id)),
    get: jest.fn(async (id: string) => skillsMap.get(id)),
    bulkGet: jest.fn(async (ids: string[]) => {
      const result = new Map<string, InternalSkillDefinition>();
      for (const id of ids) {
        const skill = skillsMap.get(id);
        if (skill) result.set(id, skill);
      }
      return result;
    }),
    list: jest.fn(async () => skills),
    create: jest.fn(async (params) => ({
      ...params,
      readonly: false,
      basePath: '/skills',
      getRegistryTools: () => params.tool_ids ?? [],
      referencedContentCount: params.referenced_content?.length ?? 0,
    })),
    update: jest.fn(async (id, update) => ({
      id,
      name: update.name ?? 'original-name',
      description: update.description ?? 'original-description',
      content: update.content ?? 'original-content',
      readonly: false,
      basePath: '/skills',
      getRegistryTools: () => update.tool_ids ?? [],
      referencedContentCount: 0,
    })),
    delete: jest.fn(async (_skillId: string) => undefined),
  };
};

const createMockToolRegistry = (toolIds: string[] = []): ToolRegistry =>
  ({
    has: jest.fn(async (id: string) => toolIds.includes(id)),
  } as unknown as ToolRegistry);

describe('createSkillRegistry', () => {
  const builtinSkill1 = createMockInternalSkillDefinition({
    id: 'builtin-skill-1',
    name: 'builtin-skill-1-name',
    readonly: true,
  });
  const persistedSkill1 = createMockInternalSkillDefinition({
    id: 'custom-skill-1',
    name: 'custom-skill-1-name',
    description: 'Description for custom-skill-1',
    content: 'Content for custom-skill-1',
    readonly: false,
  });

  describe('has', () => {
    it('returns true for a built-in skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('builtin-skill-1')).toBe(true);
    });

    it('returns true for a persisted skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('custom-skill-1')).toBe(true);
    });

    it('returns false for a non-existent skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('non-existent')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns built-in skill when it exists', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('builtin-skill-1')).toEqual(builtinSkill1);
    });

    it('returns persisted skill when no built-in exists', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('custom-skill-1')).toEqual(persistedSkill1);
    });

    it('prefers built-in over persisted', async () => {
      const overlapSkill = createMockInternalSkillDefinition({
        id: 'builtin-skill-1',
        readonly: false,
      });
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([overlapSkill]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('builtin-skill-1')).toEqual(builtinSkill1);
    });

    it('returns undefined for non-existent skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns merged list with correct readonly flags', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.list();
      expect(result).toHaveLength(2);

      const builtin = result.find((s) => s.id === 'builtin-skill-1');
      expect(builtin?.readonly).toBe(true);

      const persisted = result.find((s) => s.id === 'custom-skill-1');
      expect(persisted?.readonly).toBe(false);
    });
  });

  describe('list with summaryOnly', () => {
    it('forwards options to both providers', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.list({ summaryOnly: true });
      expect(result).toHaveLength(2);

      expect(builtinProvider.list).toHaveBeenCalledWith({ summaryOnly: true });
      expect(persistedProvider.list).toHaveBeenCalledWith({ summaryOnly: true });
    });
  });

  describe('list with type filter', () => {
    it('returns only built-in skills when type is built-in', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.list({ type: 'built-in' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('builtin-skill-1');
      expect(builtinProvider.list).toHaveBeenCalledWith({});
      expect(persistedProvider.list).not.toHaveBeenCalled();
    });

    it('returns only persisted skills when type is persisted', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.list({ type: 'persisted' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('custom-skill-1');
      expect(persistedProvider.list).toHaveBeenCalledWith({});
      expect(builtinProvider.list).not.toHaveBeenCalled();
    });

    it('does not forward the type field to providers', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await registry.list({ type: 'built-in', summaryOnly: true });
      expect(builtinProvider.list).toHaveBeenCalledWith({ summaryOnly: true });
    });
  });

  describe('bulkGet', () => {
    it('returns all built-in skills when all IDs are built-in', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.bulkGet(['builtin-skill-1']);
      expect(result.size).toBe(1);
      expect(result.get('builtin-skill-1')).toEqual(builtinSkill1);
      expect(persistedProvider.bulkGet).not.toHaveBeenCalled();
    });

    it('falls through to persisted provider for non-builtin IDs', async () => {
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.bulkGet(['custom-skill-1']);
      expect(result.size).toBe(1);
      expect(result.get('custom-skill-1')).toEqual(persistedSkill1);
      expect(persistedProvider.bulkGet).toHaveBeenCalledWith(['custom-skill-1']);
    });

    it('merges results from both providers', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.bulkGet(['builtin-skill-1', 'custom-skill-1']);
      expect(result.size).toBe(2);
      expect(result.get('builtin-skill-1')).toEqual(builtinSkill1);
      expect(result.get('custom-skill-1')).toEqual(persistedSkill1);
    });

    it('omits IDs that are not found in either provider', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.bulkGet(['builtin-skill-1', 'non-existent']);
      expect(result.size).toBe(1);
      expect(result.has('non-existent')).toBe(false);
    });

    it('returns empty map for empty input', async () => {
      const builtinProvider = createMockBuiltinProvider([builtinSkill1]);
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider,
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.bulkGet([]);
      expect(result.size).toBe(0);
    });
  });

  describe('create', () => {
    it('creates a new persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(['tool-a']),
      });

      await registry.create({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'Instructions...',
        tool_ids: ['tool-a'],
      });

      expect(persistedProvider.create).toHaveBeenCalledWith({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'Instructions...',
        tool_ids: ['tool-a'],
      });
    });

    it('throws when skill ID already exists in built-in', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(
        registry.create({
          id: 'builtin-skill-1',
          name: 'Duplicate',
          description: 'Duplicate',
          content: 'Duplicate',
          tool_ids: [],
        })
      ).rejects.toThrow("Skill with id 'builtin-skill-1' already exists");
    });

    it('throws when tool IDs are invalid', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(['tool-a']),
      });

      await expect(
        registry.create({
          id: 'new-skill',
          name: 'New Skill',
          description: 'Description',
          content: 'Content',
          tool_ids: ['tool-a', 'invalid-tool'],
        })
      ).rejects.toThrow('Invalid tool IDs: invalid-tool');
    });

    it('throws when more than 5 tool IDs are provided', async () => {
      const toolIds = ['tool-1', 'tool-2', 'tool-3', 'tool-4', 'tool-5', 'tool-6'];
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(toolIds),
      });

      await expect(
        registry.create({
          id: 'new-skill',
          name: 'New Skill',
          description: 'Description',
          content: 'Content',
          tool_ids: toolIds,
        })
      ).rejects.toThrow('A skill can reference at most 5 tools, but 6 were provided');
    });

    it('allows exactly 5 tool IDs', async () => {
      const toolIds = ['tool-1', 'tool-2', 'tool-3', 'tool-4', 'tool-5'];
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(toolIds),
      });

      await registry.create({
        id: 'new-skill',
        name: 'New Skill',
        description: 'Description',
        content: 'Content',
        tool_ids: toolIds,
      });

      expect(persistedProvider.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates a persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      await registry.update('custom-skill-1', { name: 'Updated Name' });

      expect(persistedProvider.update).toHaveBeenCalledWith('custom-skill-1', {
        name: 'Updated Name',
      });
    });

    it('throws when trying to update a built-in skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.update('builtin-skill-1', { name: 'Updated' })).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });

    it('throws when updating with more than 5 tool IDs', async () => {
      const toolIds = ['tool-1', 'tool-2', 'tool-3', 'tool-4', 'tool-5', 'tool-6'];
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(toolIds),
      });

      await expect(registry.update('custom-skill-1', { tool_ids: toolIds })).rejects.toThrow(
        'A skill can reference at most 5 tools, but 6 were provided'
      );
    });
  });

  describe('delete', () => {
    it('deletes a persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      await registry.delete('custom-skill-1');
      expect(persistedProvider.delete).toHaveBeenCalledWith('custom-skill-1');
    });

    it('throws when trying to delete a built-in skill', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.delete('builtin-skill-1')).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });

    it('delegates to persisted provider for non-existent skill', async () => {
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      await registry.delete('non-existent');
      expect(persistedProvider.delete).toHaveBeenCalledWith('non-existent');
    });
  });
});
