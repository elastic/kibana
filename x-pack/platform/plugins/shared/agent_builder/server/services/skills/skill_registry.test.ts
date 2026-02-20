/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillRegistry, type SkillRegistry } from './skill_registry';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';

// Mock the validation function
jest.mock('@kbn/agent-builder-server/skills', () => {
  const actual = jest.requireActual('@kbn/agent-builder-server/skills');
  return {
    ...actual,
    validateSkillDefinition: jest.fn(async (skill) => skill),
  };
});

// Mock the utils
jest.mock('../runner/store/volumes/skills/utils', () => ({
  getSkillEntryPath: jest.fn(({ skill }) => `${skill.basePath}/${skill.name}/SKILL.md`),
}));

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = createSkillRegistry();
  });

  const createMockSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
    id: 'test-skill-1',
    name: 'test-skill',
    basePath: 'skills/platform',
    description: 'A test skill',
    content: 'Skill body content',
    ...overrides,
  });

  describe('register', () => {
    it('registers a skill successfully', async () => {
      const skill = createMockSkill();
      await expect(registry.register(skill)).resolves.not.toThrow();
      expect(registry.has('test-skill-1')).toBe(true);
    });

    it('throws error when registering duplicate skill id', async () => {
      const skill1 = createMockSkill({ id: 'duplicate-id' });
      const skill2 = createMockSkill({ id: 'duplicate-id', name: 'different-name' });

      await registry.register(skill1);
      await expect(registry.register(skill2)).rejects.toThrow(
        'Skill type with id duplicate-id already registered'
      );
    });

    it('throws error when registering skill with duplicate path and name', async () => {
      const skill1 = createMockSkill({
        id: 'skill-1',
        name: 'same-name',
        basePath: 'skills/platform',
      });
      const skill2 = createMockSkill({
        id: 'skill-2',
        name: 'same-name',
        basePath: 'skills/platform',
      });

      await registry.register(skill1);
      await expect(registry.register(skill2)).rejects.toThrow(
        'Skill with path skills/platform and name same-name already registered'
      );
    });

    it('allows different skills with same name but different base paths', async () => {
      const skill1 = createMockSkill({
        id: 'skill-1',
        name: 'same-name',
        basePath: 'skills/platform',
      });
      const skill2 = createMockSkill({
        id: 'skill-2',
        name: 'same-name',
        basePath: 'skills/security/alerts',
      });

      await expect(registry.register(skill1)).resolves.not.toThrow();
      await expect(registry.register(skill2)).resolves.not.toThrow();
      expect(registry.has('skill-1')).toBe(true);
      expect(registry.has('skill-2')).toBe(true);
    });

    it('allows different skills with same base path but different names', async () => {
      const skill1 = createMockSkill({
        id: 'skill-1',
        name: 'skill-a',
        basePath: 'skills/platform',
      });
      const skill2 = createMockSkill({
        id: 'skill-2',
        name: 'skill-b',
        basePath: 'skills/platform',
      });

      await expect(registry.register(skill1)).resolves.not.toThrow();
      await expect(registry.register(skill2)).resolves.not.toThrow();
      expect(registry.has('skill-1')).toBe(true);
      expect(registry.has('skill-2')).toBe(true);
    });

    it('validates skill definition before registering', async () => {
      const skill = createMockSkill();

      await registry.register(skill);

      expect(validateSkillDefinition).toHaveBeenCalledWith(skill);
    });
  });

  describe('unregister', () => {
    it('removes a registered skill and returns true', async () => {
      const skill = createMockSkill({ id: 'skill-to-remove' });
      await registry.register(skill);
      expect(registry.has('skill-to-remove')).toBe(true);

      const result = await registry.unregister('skill-to-remove');
      expect(result).toBe(true);
      expect(registry.has('skill-to-remove')).toBe(false);
      expect(registry.get('skill-to-remove')).toBeUndefined();
    });

    it('returns false for non-existent skill', async () => {
      expect(await registry.unregister('non-existent')).toBe(false);
    });

    it('removes the skill from list()', async () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      await registry.register(skill1);
      await registry.register(skill2);

      await registry.unregister('skill-1');

      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(skill2);
    });

    it('frees the path so the same path+name can be re-registered', async () => {
      const skill = createMockSkill({
        id: 'skill-1',
        name: 'my-skill',
        basePath: 'skills/platform',
      });
      await registry.register(skill);
      await registry.unregister('skill-1');

      const newSkill = createMockSkill({
        id: 'skill-2',
        name: 'my-skill',
        basePath: 'skills/platform',
      });
      await expect(registry.register(newSkill)).resolves.not.toThrow();
      expect(registry.has('skill-2')).toBe(true);
    });
  });

  describe('has', () => {
    it('returns false for non-existent skill', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('returns true for registered skill', async () => {
      const skill = createMockSkill({ id: 'registered-skill' });
      await registry.register(skill);
      expect(registry.has('registered-skill')).toBe(true);
    });

    it('returns false after skill is unregistered', async () => {
      const skill = createMockSkill({ id: 'temp-skill' });
      await registry.register(skill);
      expect(registry.has('temp-skill')).toBe(true);
      await registry.unregister('temp-skill');
      expect(registry.has('temp-skill')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns undefined for non-existent skill', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('returns the registered skill', async () => {
      const skill = createMockSkill({ id: 'get-skill', description: 'Get test skill' });
      await registry.register(skill);

      const retrieved = registry.get('get-skill');
      expect(retrieved).toEqual(skill);
    });

    it('returns correct skill when multiple skills are registered', async () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-one' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-two' });

      await registry.register(skill1);
      await registry.register(skill2);

      expect(registry.get('skill-1')).toEqual(skill1);
      expect(registry.get('skill-2')).toEqual(skill2);
    });
  });

  describe('list', () => {
    it('returns empty array when no skills are registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered skills', async () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      const skill3 = createMockSkill({ id: 'skill-3', name: 'skill-3' });

      await registry.register(skill1);
      await registry.register(skill2);
      await registry.register(skill3);

      const list = registry.list();
      expect(list).toHaveLength(3);
      expect(list).toEqual(expect.arrayContaining([skill1, skill2, skill3]));
    });

    it('returns skills in registration order', async () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      const skill3 = createMockSkill({ id: 'skill-3', name: 'skill-3' });

      await registry.register(skill1);
      await registry.register(skill2);
      await registry.register(skill3);

      const list = registry.list();
      expect(list[0]).toEqual(skill1);
      expect(list[1]).toEqual(skill2);
      expect(list[2]).toEqual(skill3);
    });

    it('returns a new array each time', async () => {
      const skill = createMockSkill({ id: 'skill-1' });
      await registry.register(skill);

      const list1 = registry.list();
      const list2 = registry.list();

      expect(list1).not.toBe(list2); // Different array instances
      expect(list1).toEqual(list2); // But same content
    });
  });

  describe('createSkillRegistry', () => {
    it('creates a new registry instance', () => {
      const registry1 = createSkillRegistry();
      const registry2 = createSkillRegistry();

      expect(registry1).not.toBe(registry2);
    });

    it('creates an empty registry', () => {
      const newRegistry = createSkillRegistry();
      expect(newRegistry.list()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles skills with empty body', async () => {
      const skill = createMockSkill({ content: '' });
      await expect(registry.register(skill)).resolves.not.toThrow();
      expect(registry.get('test-skill-1')).toEqual(skill);
    });

    it('handles skills with long descriptions', async () => {
      const skill = createMockSkill({ description: 'a'.repeat(1000) });
      await expect(registry.register(skill)).resolves.not.toThrow();
    });

    it('handles skills with special characters in body', async () => {
      const skill = createMockSkill({
        content: 'Body with "quotes" and \'apostrophes\' and\nnewlines',
      });
      await expect(registry.register(skill)).resolves.not.toThrow();
      expect(registry.get('test-skill-1')?.content).toBe(
        'Body with "quotes" and \'apostrophes\' and\nnewlines'
      );
    });

    it('handles multiple registrations and retrievals', async () => {
      const skills = Array.from({ length: 10 }, (_, i) =>
        createMockSkill({ id: `skill-${i}`, name: `skill-${i}` })
      );

      for (const skill of skills) {
        await registry.register(skill);
      }

      expect(registry.list()).toHaveLength(10);
      skills.forEach((skill) => {
        expect(registry.has(skill.id)).toBe(true);
        expect(registry.get(skill.id)).toEqual(skill);
      });
    });
  });
});
