/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { createBuiltinSkillProvider } from './provider';

describe('createBuiltinSkillProvider', () => {
  const createMockSkillDefinition = (
    overrides: Partial<SkillDefinition> = {}
  ): SkillDefinition => ({
    id: 'test-skill',
    name: 'test-skill-name' as any,
    basePath: 'skills/platform' as any,
    description: 'A test skill',
    content: 'Skill body content',
    ...overrides,
  });

  it('has id "builtin" and readonly true', () => {
    const provider = createBuiltinSkillProvider([]);

    expect(provider.id).toBe('builtin');
    expect(provider.readonly).toBe(true);
  });

  describe('has', () => {
    it('returns true for a registered skill', () => {
      const provider = createBuiltinSkillProvider([createMockSkillDefinition({ id: 'skill-1' })]);

      expect(provider.has('skill-1')).toBe(true);
    });

    it('returns false for an unregistered skill', () => {
      const provider = createBuiltinSkillProvider([createMockSkillDefinition({ id: 'skill-1' })]);

      expect(provider.has('non-existent')).toBe(false);
    });

    it('returns false when no skills are registered', () => {
      const provider = createBuiltinSkillProvider([]);

      expect(provider.has('anything')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns converted InternalSkillDefinition for an existing skill', async () => {
      const skill = createMockSkillDefinition({
        id: 'skill-1',
        name: 'my-skill' as any,
        description: 'My skill',
      });
      const provider = createBuiltinSkillProvider([skill]);

      const result = await provider.get('skill-1');

      expect(result).toBeDefined();
      expect(result!.id).toBe('skill-1');
      expect(result!.name).toBe('my-skill');
      expect(result!.description).toBe('My skill');
      expect(result!.readonly).toBe(true);
    });

    it('returns undefined for a non-existent skill', async () => {
      const provider = createBuiltinSkillProvider([createMockSkillDefinition({ id: 'skill-1' })]);

      expect(await provider.get('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns all skills as InternalSkillDefinitions', async () => {
      const skills = [
        createMockSkillDefinition({ id: 'skill-1' }),
        createMockSkillDefinition({ id: 'skill-2' }),
      ];
      const provider = createBuiltinSkillProvider(skills);

      const result = await provider.list();

      expect(result).toHaveLength(2);
      expect(result.map((s: { id: string }) => s.id)).toEqual(['skill-1', 'skill-2']);
      result.forEach((s: { readonly: boolean }) => expect(s.readonly).toBe(true));
    });

    it('returns empty array when no skills are registered', async () => {
      const provider = createBuiltinSkillProvider([]);

      expect(await provider.list()).toEqual([]);
    });
  });
});
