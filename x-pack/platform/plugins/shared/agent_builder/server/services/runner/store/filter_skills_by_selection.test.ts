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
  ...overrides,
});

describe('filterSkillsBySelection', () => {
  const builtinA = createMockSkill('skill-a', { readonly: true });
  const builtinB = createMockSkill('skill-b', { readonly: true });
  const builtinC = createMockSkill('skill-c', { readonly: true });
  const userSkill = createMockSkill('user-skill-1', { readonly: false });
  const allSkills = [builtinA, builtinB, builtinC, userSkill];

  it('should return all skills when selection is undefined (backward compat)', () => {
    const result = filterSkillsBySelection(allSkills, undefined);
    expect(result).toEqual(allSkills);
  });

  it('should return empty array when selection is empty', () => {
    const result = filterSkillsBySelection(allSkills, []);
    expect(result).toEqual([]);
  });

  it('should return only built-in skills when wildcard is present', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['*'] }]);
    expect(result).toEqual([builtinA, builtinB, builtinC]);
  });

  it('should return built-in skills + explicit user skills when wildcard and explicit IDs are combined', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['*', 'user-skill-1'] }]);
    expect(result).toEqual(allSkills);
  });

  it('should return only explicitly selected skills', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['skill-a', 'skill-c'] }]);
    expect(result).toEqual([builtinA, builtinC]);
  });

  it('should handle selection across multiple entries', () => {
    const result = filterSkillsBySelection(allSkills, [
      { skill_ids: ['skill-a'] },
      { skill_ids: ['skill-b'] },
    ]);
    expect(result).toEqual([builtinA, builtinB]);
  });

  it('should ignore non-existent skill IDs', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['skill-a', 'non-existent'] }]);
    expect(result).toEqual([builtinA]);
  });

  it('should return empty when no explicit IDs match', () => {
    const result = filterSkillsBySelection(allSkills, [
      { skill_ids: ['non-existent-1', 'non-existent-2'] },
    ]);
    expect(result).toEqual([]);
  });

  it('should include user skills when explicitly selected without wildcard', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['user-skill-1'] }]);
    expect(result).toEqual([userSkill]);
  });
});
