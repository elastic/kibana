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

  it('throws error if tool count exceeds 7', async () => {
    const skill = createMockSkill({
      getAllowedTools: () => ['tool1', 'tool2', 'tool3', 'tool4'] as any,
      getInlineTools: async () => ['tool5', 'tool6', 'tool7', 'tool8'] as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Max tool limit exceeded'),
      })
    );
  });

  it('allows exactly 7 tools', async () => {
    const skill = createMockSkill({
      getAllowedTools: () => ['tool1', 'tool2', 'tool3', 'tool4'] as any,
      getInlineTools: async () => ['tool5', 'tool6', 'tool7'] as any,
    });

    await expect(validateSkillDefinition(skill)).resolves.toEqual(skill);
  });

  it('handles only allowed tools', async () => {
    const skill = createMockSkill({
      getAllowedTools: () => Array(8).fill('tool') as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Max tool limit exceeded'),
      })
    );
  });

  it('handles only inline tools', async () => {
    const skill = createMockSkill({
      getInlineTools: async () => Array(8).fill('tool') as any,
    });

    await expect(validateSkillDefinition(skill)).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringContaining('Max tool limit exceeded'),
      })
    );
  });

  it('handles no tools', async () => {
    const skill = createMockSkill();
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
