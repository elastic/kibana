/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';

export interface SkillServiceSetup {
  /**
   * Register a built-in skill to be exposed to built-in agents.
   */
  registerSkill(skill: SkillDefinition): void;
}

export interface SkillServiceStart {
  getSkillDefinition(skillId: string): SkillDefinition | undefined;
  listSkills(): SkillDefinition[];
}
