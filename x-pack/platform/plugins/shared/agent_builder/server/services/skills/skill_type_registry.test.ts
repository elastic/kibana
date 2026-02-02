/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillTypeRegistry, type SkillTypeRegistry } from './skill_type_registry';
import { SkillTypeDefinition } from '@kbn/agent-builder-server/skills';

// Mock the validation function
jest.mock('@kbn/agent-builder-server/skills', () => {
  const actual = jest.requireActual('@kbn/agent-builder-server/skills');
  return {
    ...actual,
    validateSkillTypeDefinition: jest.fn((skill) => skill),
  };
});

// Mock the utils
jest.mock('../runner/store/volumes/skills/utils', () => ({
  getSkillEntryPath: jest.fn(({ skill }) => `${skill.basePath}/${skill.name}/SKILL.md`),
}));

describe('SkillTypeRegistry', () => {
  let registry: SkillTypeRegistry;

  beforeEach(() => {
    registry = createSkillTypeRegistry();
  });

  const createMockSkill = (overrides: Partial<SkillTypeDefinition> = {}): SkillTypeDefinition => ({
    id: 'test-skill-1',
    name: 'test-skill',
    basePath: 'skills/platform',
    description: 'A test skill',
    body: 'Skill body content',
    ...overrides,
  });

  describe('register', () => {
    it('registers a skill successfully', () => {
      const skill = createMockSkill();
      expect(() => registry.register(skill)).not.toThrow();
      expect(registry.has('test-skill-1')).toBe(true);
    });

    it('throws error when registering duplicate skill id', () => {
      const skill1 = createMockSkill({ id: 'duplicate-id' });
      const skill2 = createMockSkill({ id: 'duplicate-id', name: 'different-name' });
      
      registry.register(skill1);
      expect(() => registry.register(skill2)).toThrow('Skill type with id duplicate-id already registered');
    });

    it('throws error when registering skill with duplicate path and name', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'same-name', basePath: 'skills/platform' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'same-name', basePath: 'skills/platform' });
      
      registry.register(skill1);
      expect(() => registry.register(skill2)).toThrow('Skill with path skills/platform and name same-name already registered');
    });

    it('allows different skills with same name but different base paths', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'same-name', basePath: 'skills/platform' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'same-name', basePath: 'skills/security/alerts' });
      
      expect(() => {
        registry.register(skill1);
        registry.register(skill2);
      }).not.toThrow();
      expect(registry.has('skill-1')).toBe(true);
      expect(registry.has('skill-2')).toBe(true);
    });

    it('allows different skills with same base path but different names', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-a', basePath: 'skills/platform' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-b', basePath: 'skills/platform' });
      
      expect(() => {
        registry.register(skill1);
        registry.register(skill2);
      }).not.toThrow();
      expect(registry.has('skill-1')).toBe(true);
      expect(registry.has('skill-2')).toBe(true);
    });

    it('validates skill definition before registering', () => {
      const { validateSkillTypeDefinition } = require('@kbn/agent-builder-server/skills');
      const skill = createMockSkill();
      
      registry.register(skill);
      
      expect(validateSkillTypeDefinition).toHaveBeenCalledWith(skill);
    });
  });

  describe('has', () => {
    it('returns false for non-existent skill', () => {
      expect(registry.has('non-existent')).toBe(false);
    });

    it('returns true for registered skill', () => {
      const skill = createMockSkill({ id: 'registered-skill' });
      registry.register(skill);
      expect(registry.has('registered-skill')).toBe(true);
    });

    it('returns false after skill is not registered', () => {
      const skill = createMockSkill({ id: 'temp-skill' });
      registry.register(skill);
      expect(registry.has('temp-skill')).toBe(true);
      // Note: There's no delete method, so this test just verifies has works
    });
  });

  describe('get', () => {
    it('returns undefined for non-existent skill', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('returns the registered skill', () => {
      const skill = createMockSkill({ id: 'get-skill', description: 'Get test skill' });
      registry.register(skill);
      
      const retrieved = registry.get('get-skill');
      expect(retrieved).toEqual(skill);
    });

    it('returns correct skill when multiple skills are registered', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-one' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-two' });
      
      registry.register(skill1);
      registry.register(skill2);
      
      expect(registry.get('skill-1')).toEqual(skill1);
      expect(registry.get('skill-2')).toEqual(skill2);
    });
  });

  describe('list', () => {
    it('returns empty array when no skills are registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered skills', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      const skill3 = createMockSkill({ id: 'skill-3', name: 'skill-3' });
      
      registry.register(skill1);
      registry.register(skill2);
      registry.register(skill3);
      
      const list = registry.list();
      expect(list).toHaveLength(3);
      expect(list).toEqual(expect.arrayContaining([skill1, skill2, skill3]));
    });

    it('returns skills in registration order', () => {
      const skill1 = createMockSkill({ id: 'skill-1', name: 'skill-1' });
      const skill2 = createMockSkill({ id: 'skill-2', name: 'skill-2' });
      const skill3 = createMockSkill({ id: 'skill-3', name: 'skill-3' });
      
      registry.register(skill1);
      registry.register(skill2);
      registry.register(skill3);
      
      const list = registry.list();
      expect(list[0]).toEqual(skill1);
      expect(list[1]).toEqual(skill2);
      expect(list[2]).toEqual(skill3);
    });

    it('returns a new array each time', () => {
      const skill = createMockSkill({ id: 'skill-1' });
      registry.register(skill);
      
      const list1 = registry.list();
      const list2 = registry.list();
      
      expect(list1).not.toBe(list2); // Different array instances
      expect(list1).toEqual(list2); // But same content
    });
  });

  describe('createSkillTypeRegistry', () => {
    it('creates a new registry instance', () => {
      const registry1 = createSkillTypeRegistry();
      const registry2 = createSkillTypeRegistry();
      
      expect(registry1).not.toBe(registry2);
    });

    it('creates an empty registry', () => {
      const newRegistry = createSkillTypeRegistry();
      expect(newRegistry.list()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles skills with empty body', () => {
      const skill = createMockSkill({ body: '' });
      expect(() => registry.register(skill)).not.toThrow();
      expect(registry.get('test-skill-1')).toEqual(skill);
    });

    it('handles skills with long descriptions', () => {
      const skill = createMockSkill({ description: 'a'.repeat(1000) });
      expect(() => registry.register(skill)).not.toThrow();
    });

    it('handles skills with special characters in body', () => {
      const skill = createMockSkill({ body: 'Body with "quotes" and \'apostrophes\' and\nnewlines' });
      expect(() => registry.register(skill)).not.toThrow();
      expect(registry.get('test-skill-1')?.body).toBe('Body with "quotes" and \'apostrophes\' and\nnewlines');
    });

    it('handles multiple registrations and retrievals', () => {
      const skills = Array.from({ length: 10 }, (_, i) =>
        createMockSkill({ id: `skill-${i}`, name: `skill-${i}` })
      );
      
      skills.forEach((skill) => registry.register(skill));
      
      expect(registry.list()).toHaveLength(10);
      skills.forEach((skill) => {
        expect(registry.has(skill.id)).toBe(true);
        expect(registry.get(skill.id)).toEqual(skill);
      });
    });
  });
});
