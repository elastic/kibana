/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { CompositeSkillRegistry } from './composite_skill_registry';

export interface SkillServiceSetup {
  /**
   * @deprecated This API is still in development and not ready to be used yet.
   */
  registerSkill(skill: SkillDefinition): Promise<void>;
}

export interface SkillServiceStart {
  /**
   * Returns a skill definition by ID from the built-in registry.
   * @deprecated Use getRegistry() for unified access.
   */
  getSkillDefinition(skillId: string): SkillDefinition | undefined;
  /**
   * Lists all built-in skills.
   * @deprecated Use getRegistry() for unified access.
   */
  listSkills(): SkillDefinition[];
  /**
   * Create a composite skill registry scoped to the current user and context.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<CompositeSkillRegistry>;
}
