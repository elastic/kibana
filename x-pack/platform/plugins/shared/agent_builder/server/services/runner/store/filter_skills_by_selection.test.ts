/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { filterSkillsBySelection } from './create_store';

const createMockSkill = (id: string): SkillDefinition => ({
  id,
  name: `${id}-name` as any,
  basePath: 'skills/platform' as any,
  description: `Description for ${id}`,
  content: `Content for ${id}`,
  getAllowedTools: () => [],
});

describe('filterSkillsBySelection', () => {
  const skillA = createMockSkill('skill-a');
  const skillB = createMockSkill('skill-b');
  const skillC = createMockSkill('skill-c');
  const allSkills = [skillA, skillB, skillC];

  it('should return all skills when selection is undefined (backward compat)', () => {
    const result = filterSkillsBySelection(allSkills, undefined);
    expect(result).toEqual(allSkills);
  });

  it('should return empty array when selection is empty', () => {
    const result = filterSkillsBySelection(allSkills, []);
    expect(result).toEqual([]);
  });

  it('should return all skills when wildcard is present', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['*'] }]);
    expect(result).toEqual(allSkills);
  });

  it('should return only explicitly selected skills', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['skill-a', 'skill-c'] }]);
    expect(result).toEqual([skillA, skillC]);
  });

  it('should handle mixed wildcard and explicit IDs (wildcard wins)', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['*', 'skill-a'] }]);
    expect(result).toEqual(allSkills);
  });

  it('should handle selection across multiple entries', () => {
    const result = filterSkillsBySelection(allSkills, [
      { skill_ids: ['skill-a'] },
      { skill_ids: ['skill-b'] },
    ]);
    expect(result).toEqual([skillA, skillB]);
  });

  it('should ignore non-existent skill IDs', () => {
    const result = filterSkillsBySelection(allSkills, [{ skill_ids: ['skill-a', 'non-existent'] }]);
    expect(result).toEqual([skillA]);
  });

  it('should return empty when no explicit IDs match', () => {
    const result = filterSkillsBySelection(allSkills, [
      { skill_ids: ['non-existent-1', 'non-existent-2'] },
    ]);
    expect(result).toEqual([]);
  });
});
