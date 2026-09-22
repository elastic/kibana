/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition, type SkillDefinition } from './type_definition';

describe('validateSkillTypeDefinition', () => {
  const createMockSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
    id: 'test-skill',
    name: 'test-skill',
    basePath: 'skills/platform' as any,
    description: 'A test skill',
    content: 'Skill body content',
    ...overrides,
  });

  it('validates a valid skill definition successfully', async () => {
    const skill = createMockSkill();
    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('throws error if inline tool count exceeds 7', async () => {
    const skill = createMockSkill({
      getInlineTools: async () => Array(8).fill('tool') as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Max inline tool limit exceeded'),
      })
    );
  });

  it('allows exactly 7 inline tools', async () => {
    const skill = createMockSkill({
      getInlineTools: async () => Array(7).fill('tool') as any,
    });

    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('does not count registry tools toward the inline tool limit', async () => {
    const skill = createMockSkill({
      getRegistryTools: () => Array(20).fill('registry-tool'),
      getInlineTools: async () => Array(7).fill('tool') as any,
    });

    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('handles no tools', async () => {
    const skill = createMockSkill();
    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('allows async getRegistryTools', async () => {
    const skill = createMockSkill({
      getRegistryTools: async () => ['tool-1', 'tool-2'],
    });

    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('throws Zod error for invalid schema fields', async () => {
    const skill = createMockSkill({
      name: 'INVALID NAME' as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow();
  });

  it('throws error if description is too long', async () => {
    const skill = createMockSkill({
      description: 'a'.repeat(1025),
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow();
  });

  it('throws error if name contains invalid characters', async () => {
    const skill = createMockSkill({
      name: 'name with spaces' as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow();
  });
});
