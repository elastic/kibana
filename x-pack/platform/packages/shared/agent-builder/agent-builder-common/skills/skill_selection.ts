/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * "all skills" wildcard which can be used for skill selection
 */
export const allSkillsSelectionWildcard = '*';

/**
 * Constant skill selection to select all built-in skills
 */
export const allBuiltInSkillsSelection: SkillSelection[] = [
  { skill_ids: [allSkillsSelectionWildcard] },
];

/**
 * Represents a skill selection based on individual skill IDs
 *
 * The '*' wildcard can be used for ID selection, to inform that all built-in skills should be selected.
 * User-created skills are NOT included by the wildcard — they must be explicitly listed.
 *
 * @example
 * ```ts
 * // select all built-in skills
 * const allSkills: SkillSelection = { skill_ids: ['*'] }
 *
 * // select all built-in skills + a specific user-created skill
 * const withUser: SkillSelection = { skill_ids: ['*', 'my-user-skill'] }
 *
 * // select specific skills
 * const specific: SkillSelection = { skill_ids: ['skill-a', 'skill-b'] }
 * ```
 */
export interface SkillSelection {
  /**
   * List of individual skill ids to select.
   */
  skill_ids: string[];
}

/**
 * Returns true if the given skill ID matches the provided skill selection.
 * @param skillId - Skill ID to check
 * @param skillSelection - Array of skill selections
 */
export const skillMatchSelection = (skillId: string, skillSelection: SkillSelection[]): boolean => {
  return skillSelection.some(
    (selection) =>
      selection.skill_ids.includes(allSkillsSelectionWildcard) ||
      selection.skill_ids.includes(skillId)
  );
};

/**
 * Returns true if the skill selection includes the wildcard.
 * @param skillSelection - Array of skill selections to check
 */
export const hasSkillSelectionWildcard = (skillSelection: SkillSelection[]): boolean => {
  return skillSelection.some((selection) =>
    selection.skill_ids.includes(allSkillsSelectionWildcard)
  );
};

/**
 * Extracts all explicit (non-wildcard) skill IDs from a skill selection.
 * @param skillSelection - Array of skill selections
 */
export const getExplicitSkillIds = (skillSelection: SkillSelection[]): string[] => {
  return skillSelection.flatMap((selection) =>
    selection.skill_ids.filter((id) => id !== allSkillsSelectionWildcard)
  );
};
