/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { createSkillRegistry, createSkillService, type SkillProvider } from './skill_service';

jest.mock('@kbn/agent-builder-server/skills', () => {
  const actual = jest.requireActual('@kbn/agent-builder-server/skills');
  return {
    ...actual,
    validateSkillDefinition: jest.fn(async (skill) => skill),
  };
});

jest.mock('../runner/store/volumes/skills/utils', () => ({
  getSkillEntryPath: jest.fn(({ skill }) => `${skill.basePath}/${skill.name}/SKILL.md`),
}));

jest.mock('./client', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../utils/spaces', () => ({
  getCurrentSpaceId: jest.fn().mockReturnValue('default'),
}));

const createMockSkillDefinition = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  id: 'test-skill-1',
  name: 'test-skill' as any,
  basePath: 'skills/platform' as any,
  description: 'A test skill',
  content: 'Skill body content',
  getAllowedTools: () => [],
  ...overrides,
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

const createMockPersistedProvider = (skills: PublicSkillDefinition[]): SkillProvider => ({
  id: 'persisted',
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

describe('createSkillService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup().registerSkill', () => {
    it('registers a skill successfully', async () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition();
      await expect(registerSkill(skill)).resolves.not.toThrow();
      expect(validateSkillDefinition).toHaveBeenCalledWith(skill);
    });

    it('throws when registering duplicate skill id', async () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      await registerSkill(createMockSkillDefinition({ id: 'dup' }));
      await expect(
        registerSkill(createMockSkillDefinition({ id: 'dup', name: 'other' as any }))
      ).rejects.toThrow('Skill type with id dup already registered');
    });

    it('throws when registering skill with duplicate path and name', async () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      await registerSkill(
        createMockSkillDefinition({ id: 'a', name: 'same' as any, basePath: 'skills/p' as any })
      );
      await expect(
        registerSkill(
          createMockSkillDefinition({ id: 'b', name: 'same' as any, basePath: 'skills/p' as any })
        )
      ).rejects.toThrow('Skill with path skills/p and name same already registered');
    });

    it('allows different skills with same name but different base paths', async () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      await expect(
        registerSkill(
          createMockSkillDefinition({
            id: 'a',
            name: 'same' as any,
            basePath: 'skills/platform' as any,
          })
        )
      ).resolves.not.toThrow();
      await expect(
        registerSkill(
          createMockSkillDefinition({
            id: 'b',
            name: 'same' as any,
            basePath: 'skills/security' as any,
          })
        )
      ).resolves.not.toThrow();
    });
  });

  describe('start().getRegistry', () => {
    it('returns a registry that includes registered built-in skills', async () => {
      const { createClient: mockCreateClient } = jest.requireMock('./client');
      mockCreateClient.mockReturnValue({
        has: jest.fn().mockResolvedValue(false),
        get: jest.fn().mockRejectedValue(new Error('not found')),
        list: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      });

      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition({ id: 'builtin-1' });
      await registerSkill(skill);

      const { getRegistry } = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('builtin-1')).toBe(true);
    });
  });
});

describe('createSkillRegistry', () => {
  const builtinSkill1 = createMockSkillDefinition({
    id: 'builtin-skill-1',
    name: 'builtin-skill-1-name' as any,
  });
  const builtinSkill2 = createMockSkillDefinition({
    id: 'builtin-skill-2',
    name: 'builtin-skill-2-name' as any,
  });
  const persistedSkill1 = createMockPublicSkillDefinition('custom-skill-1');

  describe('has', () => {
    it('returns true for a built-in skill', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('builtin-skill-1')).toBe(true);
    });

    it('returns true for a persisted skill', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [],
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('custom-skill-1')).toBe(true);
    });

    it('returns false for a non-existent skill', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.has('non-existent')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns built-in skill when it exists', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('builtin-skill-1')).toEqual(builtinSkill1);
    });

    it('returns persisted skill when no built-in exists', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [],
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('custom-skill-1')).toEqual(persistedSkill1);
    });

    it('prefers built-in over persisted', async () => {
      const overlapSkill = createMockPublicSkillDefinition('builtin-skill-1');
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([overlapSkill]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('builtin-skill-1')).toEqual(builtinSkill1);
    });

    it('returns undefined for non-existent skill', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns merged list with built-in skills marked as readonly', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
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

  describe('listSkillDefinitions', () => {
    it('returns only built-in skill definitions', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1, builtinSkill2],
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.listSkillDefinitions();
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['builtin-skill-1', 'builtin-skill-2']);
    });
  });

  describe('create', () => {
    it('creates a new persisted skill', async () => {
      const persistedProvider = createMockPersistedProvider([]);
      const registry = createSkillRegistry({
        builtinSkills: [],
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
        builtinSkills: [builtinSkill1],
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
        builtinSkills: [],
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
        builtinSkills: [],
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
        builtinSkills: [],
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
        builtinSkills: [],
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
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.update('builtin-skill-1', { name: 'Updated' })).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });

    it('throws when skill does not exist', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.update('non-existent', { name: 'Updated' })).rejects.toThrow(
        "Skill with id 'non-existent' not found"
      );
    });

    it('throws when updating with more than 5 tool IDs', async () => {
      const toolIds = ['tool-1', 'tool-2', 'tool-3', 'tool-4', 'tool-5', 'tool-6'];
      const registry = createSkillRegistry({
        builtinSkills: [],
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
        builtinSkills: [],
        persistedProvider,
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.delete('custom-skill-1');
      expect(result).toBe(true);
      expect(persistedProvider.delete).toHaveBeenCalledWith('custom-skill-1');
    });

    it('throws when trying to delete a built-in skill', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [builtinSkill1],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.delete('builtin-skill-1')).rejects.toThrow(
        "Skill 'builtin-skill-1' is read-only"
      );
    });

    it('throws when skill does not exist', async () => {
      const registry = createSkillRegistry({
        builtinSkills: [],
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.delete('non-existent')).rejects.toThrow(
        "Skill with id 'non-existent' not found"
      );
    });
  });
});
