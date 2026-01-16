/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillTypeRegistry, type SkillTypeRegistry } from './skill_type_registry';
import type { SkillServiceSetup, SkillServiceStart } from './types';

export interface SkillService {
  setup: () => SkillServiceSetup;
  start: () => SkillServiceStart;
}

export const createSkillService = (): SkillService => {
  return new SkillServiceImpl();
};

export class SkillServiceImpl implements SkillService {
  readonly skillTypeRegistry: SkillTypeRegistry;

  constructor() {
    this.skillTypeRegistry = createSkillTypeRegistry();
  }

  setup(): SkillServiceSetup {
    return {
      registerSkill: (skill) => this.skillTypeRegistry.register(skill),
    };
  }

  start(): SkillServiceStart {
    return {
      getSkillDefinition: (skillId) => {
        return this.skillTypeRegistry.get(skillId);
      },
      listSkills: () => {
        return this.skillTypeRegistry.list();
      },
    };
  }
}
