/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition, InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { createSkillRegistry, createSkillService } from './skill_service';
import type { WritableSkillProvider, ReadonlySkillProvider } from './skill_provider';

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

jest.mock('./persisted/client', () => ({
  createClient: jest.fn(() => ({
    has: jest.fn().mockResolvedValue(false),
    get: jest.fn().mockRejectedValue(new Error('not found')),
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
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
  getRegistryTools: () => [],
  ...overrides,
});

const createMockInternalSkillDefinition = (
  id: string,
  overrides: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id,
  name: `${id}-name`,
  description: `Description for ${id}`,
  content: `Content for ${id}`,
  readonly: false,
  getRegistryTools: () => [],
  ...overrides,
});

const createMockBuiltinProvider = (
  skills: InternalSkillDefinition[]
): ReadonlySkillProvider => ({
  id: 'builtin',
  readonly: true as const,
  has: jest.fn(async (skillId: string) => skills.some((s) => s.id === skillId)),
  get: jest.fn(async (skillId: string) => skills.find((s) => s.id === skillId)),
  list: jest.fn(async () => skills),
});

const createMockPersistedProvider = (
  skills: InternalSkillDefinition[]
): WritableSkillProvider => ({
  id: 'persisted',
  readonly: false as const,
  has: jest.fn(async (skillId: string) => skills.some((s) => s.id === skillId)),
  get: jest.fn(async (skillId: string) => skills.find((s) => s.id === skillId)),
  list: jest.fn(async () => skills),
  create: jest.fn(async (params) =>
    createMockInternalSkillDefinition(params.id, {
      name: params.name ?? params.id,
      description: params.description ?? '',
      content: params.content ?? '',
      readonly: false,
      getRegistryTools: () => params.tool_ids ?? [],
    })
  ),
  update: jest.fn(async (skillId, update) =>
    createMockInternalSkillDefinition(skillId, {
      name: update.name ?? 'original-name',
      description: update.description ?? 'original-description',
      content: update.content ?? 'original-content',
      readonly: false,
    })
  ),
  delete: jest.fn(async () => {}),
});

const createMockToolRegistry = (toolIds: string[] = []) =>
  ({
    has: jest.fn(async (id: string) => toolIds.includes(id)),
  } as unknown as ToolRegistry);

describe('createSkillService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setup().registerSkill', () => {
    it('registers a skill successfully', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition();
      expect(() => registerSkill(skill)).not.toThrow();
    });

    it('throws when registering duplicate skill id', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      registerSkill(createMockSkillDefinition({ id: 'dup' }));
      expect(() =>
        registerSkill(createMockSkillDefinition({ id: 'dup', name: 'other' as any }))
      ).toThrow('Skill type with id dup already registered');
    });

    it('throws when registering skill with duplicate path and name', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      registerSkill(
        createMockSkillDefinition({ id: 'a', name: 'same' as any, basePath: 'skills/p' as any })
      );
      expect(() =>
        registerSkill(
          createMockSkillDefinition({ id: 'b', name: 'same' as any, basePath: 'skills/p' as any })
        )
      ).toThrow('Skill with path skills/p and name same already registered');
    });

    it('allows different skills with same name but different base paths', () => {
      const service = createSkillService();
      const { registerSkill } = service.setup();

      expect(() =>
        registerSkill(
          createMockSkillDefinition({
            id: 'a',
            name: 'same' as any,
            basePath: 'skills/platform' as any,
          })
        )
      ).not.toThrow();
      expect(() =>
        registerSkill(
          createMockSkillDefinition({
            id: 'b',
            name: 'same' as any,
            basePath: 'skills/security' as any,
          })
        )
      ).not.toThrow();
    });
  });

  describe('start().getRegistry', () => {
    it('validates skills at start and returns a registry', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      const { registerSkill } = service.setup();

      const skill = createMockSkillDefinition({ id: 'builtin-1' });
      registerSkill(skill);

      const { getRegistry } = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const registry = await getRegistry({ request: {} as any });
      expect(await registry.has('builtin-1')).toBe(true);
      expect(validateSkillDefinition).toHaveBeenCalledWith(skill);
    });
  });

  describe('start().registerSkill (dynamic)', () => {
    it('registers a skill dynamically after start', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      service.setup();

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const skill = createMockSkillDefinition({ id: 'dynamic-1' });
      await start.registerSkill(skill);

      const registry = await start.getRegistry({ request: {} as any });
      expect(await registry.has('dynamic-1')).toBe(true);
      expect(validateSkillDefinition).toHaveBeenCalledWith(skill);
    });

    it('throws when registering duplicate skill id dynamically', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      const { registerSkill } = service.setup();

      registerSkill(createMockSkillDefinition({ id: 'dup' }));

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      await expect(
        start.registerSkill(createMockSkillDefinition({ id: 'dup', name: 'other' as any }))
      ).rejects.toThrow('Skill type with id dup already registered');
    });

    it('serializes concurrent registrations to prevent TOCTOU races', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      service.setup();

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const skillA = createMockSkillDefinition({ id: 'race-skill', name: 'race-a' as any });
      const skillB = createMockSkillDefinition({ id: 'race-skill', name: 'race-b' as any });

      const [resultA, resultB] = await Promise.allSettled([
        start.registerSkill(skillA),
        start.registerSkill(skillB),
      ]);

      const fulfilled = [resultA, resultB].filter((r) => r.status === 'fulfilled');
      const rejected = [resultA, resultB].filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason.message).toContain(
        'Skill type with id race-skill already registered'
      );
    });
  });

  describe('start().unregisterSkill', () => {
    it('unregisters a previously registered skill', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      const { registerSkill } = service.setup();
      registerSkill(createMockSkillDefinition({ id: 'removable' }));

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const result = await start.unregisterSkill('removable');
      expect(result).toBe(true);

      const registry = await start.getRegistry({ request: {} as any });
      expect(await registry.has('removable')).toBe(false);
    });

    it('returns false for non-existent skill', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      service.setup();

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const result = await start.unregisterSkill('non-existent');
      expect(result).toBe(false);
    });

    it('frees the path so a skill with the same path can be re-registered', async () => {
      const mockToolRegistry = createMockToolRegistry();
      const service = createSkillService();
      service.setup();

      const start = service.start({
        elasticsearch: { client: { asInternalUser: {} } } as any,
        logger: { warn: jest.fn() } as any,
        getToolRegistry: jest.fn().mockResolvedValue(mockToolRegistry),
      });

      const skill = createMockSkillDefinition({
        id: 'skill-1',
        name: 'my-skill' as any,
        basePath: 'skills/platform' as any,
      });
      await start.registerSkill(skill);
      await start.unregisterSkill('skill-1');

      const newSkill = createMockSkillDefinition({
        id: 'skill-2',
        name: 'my-skill' as any,
        basePath: 'skills/platform' as any,
      });
      await expect(start.registerSkill(newSkill)).resolves.not.toThrow();

      const registry = await start.getRegistry({ request: {} as any });
      expect(await registry.has('skill-2')).toBe(true);
    });
  });
});

describe('createSkillRegistry', () => {
  const builtinSkill1 = createMockInternalSkillDefinition('builtin-skill-1', {
    readonly: true,
    getRegistryTools: () => [],
  });
  const builtinSkill2 = createMockInternalSkillDefinition('builtin-skill-2', {
    readonly: true,
    getRegistryTools: () => [],
  });
  const persistedSkill1 = createMockInternalSkillDefinition('custom-skill-1', {
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
      const overlapSkill = createMockInternalSkillDefinition('builtin-skill-1', { readonly: false });
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

  describe('listSkillDefinitions', () => {
    it('returns built-in and user-created skill definitions', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.listSkillDefinitions();
      expect(result).toHaveLength(3);
      expect(result.map((s) => s.id)).toEqual([
        'builtin-skill-1',
        'builtin-skill-2',
        'custom-skill-1',
      ]);
    });

    it('does not duplicate when persisted skill has same id as built-in', async () => {
      const overlapSkill = createMockInternalSkillDefinition('builtin-skill-1', { readonly: false });
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([overlapSkill]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.listSkillDefinitions();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(builtinSkill1);
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

    it('throws when skill does not exist', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
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

      const result = await registry.delete('custom-skill-1');
      expect(result).toBe(true);
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

    it('throws when skill does not exist', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      await expect(registry.delete('non-existent')).rejects.toThrow(
        "Skill with id 'non-existent' not found"
      );
    });
  });

  describe('resolveSkillSelection', () => {
    it('returns empty array for empty selection', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      expect(await registry.resolveSkillSelection([])).toEqual([]);
    });

    it('expands wildcard to all built-in skills when no persisted exist', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['*'] }]);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual(['builtin-skill-1', 'builtin-skill-2']);
    });

    it('expands wildcard to all built-in and user-created skills', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['*'] }]);
      expect(result).toHaveLength(3);
      expect(result.map((s) => s.id)).toEqual([
        'builtin-skill-1',
        'builtin-skill-2',
        'custom-skill-1',
      ]);
    });

    it('resolves explicit IDs from built-in skills', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1, builtinSkill2]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['builtin-skill-1'] }]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('builtin-skill-1');
    });

    it('resolves explicit IDs from persisted skills', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([]),
        persistedProvider: createMockPersistedProvider([persistedSkill1]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([{ skill_ids: ['custom-skill-1'] }]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('custom-skill-1');
    });

    it('does not duplicate skills when wildcard and explicit overlap', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([
        { skill_ids: ['*', 'builtin-skill-1'] },
      ]);
      expect(result).toHaveLength(1);
    });

    it('skips non-existent skill IDs', async () => {
      const registry = createSkillRegistry({
        builtinProvider: createMockBuiltinProvider([builtinSkill1]),
        persistedProvider: createMockPersistedProvider([]),
        toolRegistry: createMockToolRegistry(),
      });

      const result = await registry.resolveSkillSelection([
        { skill_ids: ['builtin-skill-1', 'non-existent'] },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('builtin-skill-1');
    });
  });
});
