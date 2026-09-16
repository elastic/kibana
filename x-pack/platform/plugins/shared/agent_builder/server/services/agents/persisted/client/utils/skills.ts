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
  if (skillIds.length === 0) {
    return [];
  }
  const found = await skillRegistry.bulkGet(skillIds);
  return skillIds.filter((id) => !found.has(id)).map((id) => `Skill id '${id}' does not exist.`);
}
