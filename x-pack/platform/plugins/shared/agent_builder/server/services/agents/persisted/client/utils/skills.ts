/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillRegistry } from '../../../../skills/skill_registry';

export async function validateSkillIds(
  skillRegistry: SkillRegistry,
  skillIds: string[]
): Promise<string[]> {
  const errors: string[] = [];
  for (const skillId of skillIds) {
    const exists = await skillRegistry.has(skillId);
    if (!exists) {
      errors.push(`Skill id '${skillId}' does not exist.`);
    }
  }
  return errors;
}
