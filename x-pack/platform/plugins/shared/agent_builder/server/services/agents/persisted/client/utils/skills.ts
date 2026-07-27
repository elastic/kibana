/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillRegistry } from '@kbn/agent-builder-server/skills';

export interface ValidateSkillSelectionParams {
  skillRegistry: SkillRegistry;
  skillIds: string[];
}

/**
 * Validates that every skill id in a `configuration_overrides.skill_ids` selection actually
 * exists (and is visible to the caller) in the skill registry. Mirrors `validateToolSelection`
 * so skill overrides get the same 400-on-unknown-id guarantee tools already have (PR #280617
 * review — "we should have the same validation as tools").
 */
export async function validateSkillSelection({
  skillRegistry,
  skillIds,
}: ValidateSkillSelectionParams): Promise<string[]> {
  const errors: string[] = [];

  for (const skillId of skillIds) {
    const exists = await skillRegistry.has(skillId);
    if (!exists) {
      errors.push(`Skill id '${skillId}' does not exist.`);
    }
  }

  return errors;
}
