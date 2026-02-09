/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  skillMatchSelection,
  hasSkillSelectionWildcard,
  getExplicitSkillIds,
  allSkillsSelectionWildcard,
  allBuiltInSkillsSelection,
} from './skill_selection';

describe('SkillSelection utilities', () => {
  describe('skillMatchSelection', () => {
    it('should return true when skill ID is explicitly listed', () => {
      const selection = [{ skill_ids: ['skill-a', 'skill-b'] }];
      expect(skillMatchSelection('skill-a', selection)).toBe(true);
      expect(skillMatchSelection('skill-b', selection)).toBe(true);
    });

    it('should return false when skill ID is not listed', () => {
      const selection = [{ skill_ids: ['skill-a', 'skill-b'] }];
      expect(skillMatchSelection('skill-c', selection)).toBe(false);
    });

    it('should return true when wildcard is present', () => {
      const selection = [{ skill_ids: [allSkillsSelectionWildcard] }];
      expect(skillMatchSelection('any-skill', selection)).toBe(true);
    });

    it('should return true when wildcard is mixed with explicit IDs', () => {
      const selection = [{ skill_ids: [allSkillsSelectionWildcard, 'skill-a'] }];
      expect(skillMatchSelection('skill-b', selection)).toBe(true);
    });

    it('should return false for empty selection', () => {
      expect(skillMatchSelection('skill-a', [])).toBe(false);
    });

    it('should match across multiple selection entries', () => {
      const selection = [
        { skill_ids: ['skill-a'] },
        { skill_ids: ['skill-b'] },
      ];
      expect(skillMatchSelection('skill-a', selection)).toBe(true);
      expect(skillMatchSelection('skill-b', selection)).toBe(true);
      expect(skillMatchSelection('skill-c', selection)).toBe(false);
    });
  });

  describe('hasSkillSelectionWildcard', () => {
    it('should return true when wildcard is present', () => {
      expect(hasSkillSelectionWildcard([{ skill_ids: ['*'] }])).toBe(true);
    });

    it('should return false when no wildcard', () => {
      expect(hasSkillSelectionWildcard([{ skill_ids: ['skill-a'] }])).toBe(false);
    });

    it('should return false for empty selection', () => {
      expect(hasSkillSelectionWildcard([])).toBe(false);
    });

    it('should detect wildcard in mixed selection', () => {
      expect(
        hasSkillSelectionWildcard([
          { skill_ids: ['skill-a'] },
          { skill_ids: ['*', 'skill-b'] },
        ])
      ).toBe(true);
    });
  });

  describe('getExplicitSkillIds', () => {
    it('should return explicit skill IDs', () => {
      const selection = [{ skill_ids: ['skill-a', 'skill-b'] }];
      expect(getExplicitSkillIds(selection)).toEqual(['skill-a', 'skill-b']);
    });

    it('should exclude the wildcard', () => {
      const selection = [{ skill_ids: ['*', 'skill-a'] }];
      expect(getExplicitSkillIds(selection)).toEqual(['skill-a']);
    });

    it('should return empty array for wildcard-only selection', () => {
      const selection = [{ skill_ids: ['*'] }];
      expect(getExplicitSkillIds(selection)).toEqual([]);
    });

    it('should return empty array for empty selection', () => {
      expect(getExplicitSkillIds([])).toEqual([]);
    });

    it('should flatten multiple selection entries', () => {
      const selection = [
        { skill_ids: ['skill-a', 'skill-b'] },
        { skill_ids: ['skill-c'] },
      ];
      expect(getExplicitSkillIds(selection)).toEqual(['skill-a', 'skill-b', 'skill-c']);
    });
  });

  describe('allBuiltInSkillsSelection', () => {
    it('should be a wildcard selection', () => {
      expect(allBuiltInSkillsSelection).toEqual([{ skill_ids: ['*'] }]);
      expect(hasSkillSelectionWildcard(allBuiltInSkillsSelection)).toBe(true);
    });
  });
});
