/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import { createSkillService } from './skill_service';

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

const createMockToolRegistry = (toolIds: string[] = []) =>
  ({
    has: jest.fn(async (id: string) => toolIds.includes(id)),
  } as any);

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
