/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillRegistry } from './skill_registry';
import type { SkillRegistry, SkillProvider } from './skill_service';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';

const createMockSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id: 'test-skill-1',
  name: 'test-skill',
  basePath: 'skills/platform',
  description: 'A test skill',
  content: 'Skill body content',
  ...overrides,
});

const createMockPersistedProvider = (overrides: Partial<SkillProvider> = {}): SkillProvider => ({
  id: 'persisted',
  has: jest.fn().mockResolvedValue(false),
  get: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation(async (req) => ({
    id: req.id,
    name: req.name,
    description: req.description,
    content: req.content,
  })),
  update: jest.fn().mockImplementation(async (_id, req) => ({
    id: _id,
    name: req.name ?? 'updated',
    description: req.description ?? '',
    content: req.content ?? '',
  })),
  delete: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockToolRegistry = (overrides: Partial<ToolRegistry> = {}): ToolRegistry =>
  ({
    has: jest.fn().mockReturnValue(true),
    get: jest.fn().mockReturnValue(undefined),
    list: jest.fn().mockReturnValue([]),
    ...overrides,
  } as unknown as ToolRegistry);

const createMockRegistryParams = ({
  builtinSkills = [],
  persistedProvider,
  toolRegistry,
}: {
  builtinSkills?: SkillDefinition[];
  persistedProvider?: SkillProvider;
  toolRegistry?: ToolRegistry;
} = {}) => ({
  builtinSkills,
  persistedProvider: persistedProvider ?? createMockPersistedProvider(),
  toolRegistry: toolRegistry ?? createMockToolRegistry(),
});

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = createSkillRegistry(createMockRegistryParams());
  });

  describe('has', () => {
    it('returns false for non-existent skill', async () => {
      expect(await registry.has('non-existent')).toBe(false);
    });

    it('returns true for a builtin skill', async () => {
      const skill = createMockSkill({ id: 'builtin-1' });
      registry = createSkillRegistry(createMockRegistryParams({ builtinSkills: [skill] }));
      expect(await registry.has('builtin-1')).toBe(true);
    });

    it('delegates to persisted provider when not a builtin', async () => {
      const persistedProvider = createMockPersistedProvider({
        has: jest.fn().mockResolvedValue(true),
      });
      registry = createSkillRegistry(createMockRegistryParams({ persistedProvider }));
      expect(await registry.has('persisted-1')).toBe(true);
      expect(persistedProvider.has).toHaveBeenCalledWith('persisted-1');
    });
  });

  describe('get', () => {
    it('returns undefined for non-existent skill', async () => {
      expect(await registry.get('non-existent')).toBeUndefined();
    });

    it('returns a builtin skill', async () => {
      const skill = createMockSkill({ id: 'builtin-1', description: 'Builtin skill' });
      registry = createSkillRegistry(createMockRegistryParams({ builtinSkills: [skill] }));

      const retrieved = await registry.get('builtin-1');
      expect(retrieved).toEqual(skill);
    });

    it('delegates to persisted provider for non-builtin skills', async () => {
      const publicSkill: PublicSkillDefinition = {
        id: 'persisted-1',
        name: 'persisted',
        description: 'A persisted skill',
        content: 'content',
        readonly: false,
      };
      const persistedProvider = createMockPersistedProvider({
        get: jest.fn().mockResolvedValue(publicSkill),
      });
      registry = createSkillRegistry(createMockRegistryParams({ persistedProvider }));

      const retrieved = await registry.get('persisted-1');
      expect(retrieved).toEqual(publicSkill);
    });

    it('returns builtin skill even if persisted provider also has it', async () => {
      const builtinSkill = createMockSkill({ id: 'overlap', description: 'builtin version' });
      const persistedProvider = createMockPersistedProvider({
        get: jest.fn().mockResolvedValue({ id: 'overlap', description: 'persisted version' }),
      });
      registry = createSkillRegistry(
        createMockRegistryParams({ builtinSkills: [builtinSkill], persistedProvider })
      );

      const retrieved = await registry.get('overlap');
      expect(retrieved).toEqual(builtinSkill);
    });
  });

  describe('list', () => {
    it('returns empty array when no skills exist', async () => {
      expect(await registry.list()).toEqual([]);
    });

    it('returns builtin skills as public definitions', async () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      registry = createSkillRegistry(createMockRegistryParams({ builtinSkills: [skill1, skill2] }));

      const list = await registry.list();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('skill-1');
      expect(list[0].readonly).toBe(true);
      expect(list[1].id).toBe('skill-2');
    });

    it('includes persisted skills alongside builtins', async () => {
      const builtinSkill = createMockSkill({ id: 'builtin-1', name: 'builtin' });
      const persistedSkill: PublicSkillDefinition = {
        id: 'persisted-1',
        name: 'persisted',
        description: 'Persisted skill',
        content: 'content',
        readonly: false,
      };
      const persistedProvider = createMockPersistedProvider({
        list: jest.fn().mockResolvedValue([persistedSkill]),
      });
      registry = createSkillRegistry(
        createMockRegistryParams({ builtinSkills: [builtinSkill], persistedProvider })
      );

      const list = await registry.list();
      expect(list).toHaveLength(2);
      expect(list.find((s) => s.id === 'builtin-1')).toBeDefined();
      expect(list.find((s) => s.id === 'persisted-1')).toBeDefined();
    });
  });

  describe('create', () => {
    it('creates a persisted skill', async () => {
      const created = await registry.create({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'content',
        tool_ids: [],
      });
      expect(created.id).toBe('new-skill');
    });

    it('rejects creating a skill with a duplicate builtin id', async () => {
      const skill = createMockSkill({ id: 'builtin-1' });
      registry = createSkillRegistry(createMockRegistryParams({ builtinSkills: [skill] }));

      await expect(
        registry.create({
          id: 'builtin-1',
          name: 'Duplicate',
          description: '',
          content: '',
          tool_ids: [],
        })
      ).rejects.toThrow(/already exists/);
    });

    it('rejects creating a skill with a duplicate persisted id', async () => {
      const persistedProvider = createMockPersistedProvider({
        has: jest.fn().mockResolvedValue(true),
      });
      registry = createSkillRegistry(createMockRegistryParams({ persistedProvider }));

      await expect(
        registry.create({
          id: 'existing-persisted',
          name: 'Dup',
          description: '',
          content: '',
          tool_ids: [],
        })
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('delete', () => {
    it('deletes a persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider({
        has: jest.fn().mockResolvedValue(true),
      });
      registry = createSkillRegistry(createMockRegistryParams({ persistedProvider }));

      const result = await registry.delete('persisted-1');
      expect(result).toBe(true);
      expect(persistedProvider.delete).toHaveBeenCalledWith('persisted-1');
    });

    it('rejects deleting a builtin skill', async () => {
      const skill = createMockSkill({ id: 'builtin-1' });
      registry = createSkillRegistry(createMockRegistryParams({ builtinSkills: [skill] }));

      await expect(registry.delete('builtin-1')).rejects.toThrow(/read-only/);
    });
  });

  describe('createSkillRegistry', () => {
    it('creates a new registry instance', () => {
      const registry1 = createSkillRegistry(createMockRegistryParams());
      const registry2 = createSkillRegistry(createMockRegistryParams());

      expect(registry1).not.toBe(registry2);
    });

    it('creates an empty registry', async () => {
      const newRegistry = createSkillRegistry(createMockRegistryParams());
      expect(await newRegistry.list()).toEqual([]);
    });
  });
});
