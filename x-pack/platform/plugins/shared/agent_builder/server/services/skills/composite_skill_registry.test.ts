/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ReadonlySkillProvider, WritableSkillProvider } from './skill_provider';
import { createCompositeSkillRegistry } from './composite_skill_registry';

const createMockSkillDefinition = (id: string): SkillDefinition => ({
  id,
  name: `${id}-name` as any,
  basePath: 'skills/platform' as any,
  description: `Description for ${id}`,
  content: `Content for ${id}`,
  getAllowedTools: () => [],
});

const createMockPublicSkillDefinition = (
  id: string,
  overrides: Partial<PublicSkillDefinition> = {}
): PublicSkillDefinition => ({
  id,
  name: `${id}-name`,
  description: `Description for ${id}`,
  content: `Content for ${id}`,
  readonly: false,
  ...overrides,
});

const createMockBuiltinProvider = (skills: SkillDefinition[]): ReadonlySkillProvider => ({
  id: 'builtin',
  readonly: true,
  has: jest.fn(async (id: string) => skills.some((s) => s.id === id)),
  get: jest.fn(async (id: string) => skills.find((s) => s.id === id)),
  list: jest.fn(async () => skills),
});

const createMockPersistedProvider = (skills: PublicSkillDefinition[]): WritableSkillProvider => ({
  id: 'persisted',
  readonly: false,
  has: jest.fn(async (id: string) => skills.some((s) => s.id === id)),
  get: jest.fn(async (id: string) => skills.find((s) => s.id === id)),
  list: jest.fn(async () => skills),
  create: jest.fn(async (params) => ({
    ...params,
    readonly: false,
  })),
  update: jest.fn(async (id, update) => ({
    id,
    name: update.name ?? 'original-name',
    description: update.description ?? 'original-description',
    content: update.content ?? 'original-content',
    readonly: false,
  })),
  delete: jest.fn(async () => true),
});

const createMockToolRegistry = (toolIds: string[] = []): ToolRegistry =>
  ({
    has: jest.fn(async (id: string) => toolIds.includes(id)),
  } as unknown as ToolRegistry);

describe('CompositeSkillRegistry', () => {
  const builtinSkill1 = createMockSkillDefinition('builtin-skill-1');
  const builtinSkill2 = createMockSkillDefinition('builtin-skill-2');
  const persistedSkill1 = createMockPublicSkillDefinition('custom-skill-1');

  describe('has', () => {
    it('should return true for a built-in skill', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('builtin-skill-1')).toBe(true);
    });

    it('should return true for a persisted skill', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('custom-skill-1')).toBe(true);
    });

    it('should return false for a non-existent skill', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('non-existent')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return built-in skill when it exists', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.get('builtin-skill-1');
      expect(result).toEqual(builtinSkill1);
    });

    it('should return persisted skill when no built-in exists', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.get('custom-skill-1');
      expect(result).toEqual(persistedSkill1);
    });

    it('should prefer built-in over persisted', async () => {
      const overlapSkill = createMockPublicSkillDefinition('builtin-skill-1');
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([overlapSkill]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.get('builtin-skill-1');
      expect(result).toEqual(builtinSkill1);
    });
  });

  describe('list', () => {
    it('should return merged list with built-in skills marked as readonly', async () => {
      const registry = createCompositeSkillRegistry({
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

  describe('create', () => {
    it('should create a new persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createCompositeSkillRegistry({
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

    it('should throw when skill ID already exists in built-in', async () => {
      const registry = createCompositeSkillRegistry({
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

    it('should throw when tool IDs are invalid', async () => {
      const registry = createCompositeSkillRegistry({
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
  });

  describe('update', () => {
    it('should update a persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      await registry.update('custom-skill-1', { name: 'Updated Name' });

      expect(persistedProvider.update).toHaveBeenCalledWith('custom-skill-1', {
        name: 'Updated Name',
      });
    });

    it('should throw when trying to update a built-in skill', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.update('builtin-skill-1', { name: 'Updated' })).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });
  });

  describe('delete', () => {
    it('should delete a persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([persistedSkill1]);
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.delete('custom-skill-1');
      expect(result).toBe(true);
      expect(persistedProvider.delete).toHaveBeenCalledWith('custom-skill-1');
    });

    it('should throw when trying to delete a built-in skill', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.delete('builtin-skill-1')).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });
  });

  describe('resolveSkillSelection', () => {
    it('should return empty array for empty selection', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([]);
      expect(result).toEqual([]);
    });

    it('should expand wildcard to all built-in skills', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['*'] }]);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['builtin-skill-1', 'builtin-skill-2']);
    });

    it('should resolve explicit IDs from built-in skills', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['builtin-skill-1'] }]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('builtin-skill-1');
    });

    it('should resolve explicit IDs from persisted skills', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['custom-skill-1'] }]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('custom-skill-1');
    });

    it('should not duplicate skills when wildcard and explicit overlap', async () => {
      const registry = createCompositeSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([
        { skill_ids: ['*', 'builtin-skill-1'] },
      ]);
      expect(result).toHaveLength(1);
    });
  });
});
