/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { filterSkillsBySelection } from './create_store';

const createMockSkill = (
  id: string,
  overrides: Partial<InternalSkillDefinition> = {}
): InternalSkillDefinition => ({
  id,
  name: `${id}-name`,
  description: `Description for ${id}`,
  content: `Content for ${id}`,
  readonly: true,
  basePath: 'skills/platform',
  getRegistryTools: () => [],
  referencedContentCount: 0,
  ...overrides,
});

describe('filterSkillsBySelection', () => {
  const skillA = createMockSkill('skill-a');
  const skillB = createMockSkill('skill-b');
  const skillC = createMockSkill('skill-c');
  const userSkill = createMockSkill('user-skill-1', { readonly: false });
  const allSkills = [skillA, skillB, skillC, userSkill];

  it('should return all skills when selection is undefined (backward compat)', () => {
    const result = filterSkillsBySelection(allSkills, undefined);
    expect(result).toEqual(allSkills);
  });

  it('should return empty array when selection is empty', () => {
    const result = filterSkillsBySelection(allSkills, []);
    expect(result).toEqual([]);
  });

  it('should return only explicitly selected skills', () => {
    const result = filterSkillsBySelection(allSkills, ['skill-a', 'skill-c']);
    expect(result).toEqual([skillA, skillC]);
  });

  it('should ignore non-existent skill IDs', () => {
    const result = filterSkillsBySelection(allSkills, ['skill-a', 'non-existent']);
    expect(result).toEqual([skillA]);
  });

  it('should return empty when no IDs match', () => {
    const result = filterSkillsBySelection(allSkills, ['non-existent-1', 'non-existent-2']);
    expect(result).toEqual([]);
  });

  it('should include user skills when explicitly selected', () => {
    const result = filterSkillsBySelection(allSkills, ['user-skill-1']);
    expect(result).toEqual([userSkill]);
  });

  it('should return all matching skills across builtin and user types', () => {
    const result = filterSkillsBySelection(allSkills, ['skill-a', 'skill-b', 'user-skill-1']);
    expect(result).toEqual([skillA, skillB, userSkill]);
  });
});
