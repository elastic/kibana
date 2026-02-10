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

const createMockToolRegistry = (toolIds: string[] = []) =>
  ({
    has: jest.fn(async (id: string) => toolIds.includes(id)),
  } as any);

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
