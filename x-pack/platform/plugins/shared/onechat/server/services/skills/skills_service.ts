/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { isAllowedBuiltinSkill } from '@kbn/onechat-server/allow_lists';
import { createBuiltinSkillRegistry, registerBuiltinSkills, type BuiltinSkillRegistry } from './builtin';
import type { SkillsServiceSetup, SkillsServiceStart } from './types';

export interface SkillsServiceSetupDeps {
  logger: Logger;
}

export class SkillsService {
  private setupDeps?: SkillsServiceSetupDeps;
  private builtinRegistry: BuiltinSkillRegistry;

  constructor() {
    this.builtinRegistry = createBuiltinSkillRegistry();
  }

  setup(deps: SkillsServiceSetupDeps): SkillsServiceSetup {
    this.setupDeps = deps;
    registerBuiltinSkills({ registry: this.builtinRegistry });

    return {
      register: (skill) => {
        if (!isAllowedBuiltinSkill(skill.namespace)) {
          throw new Error(
            `Built-in skill with id "${skill.namespace}" is not in the list of allowed built-in skills.
             Please add it to the list of allowed built-in skills in the "@kbn/onechat-server/allow_lists.ts" file.`
          );
        }
        return this.builtinRegistry.register(skill);
      },
    };
  }

  start(): SkillsServiceStart {
    return {
      getAllSkills: () => {
        return this.builtinRegistry.list();
      },
    };
  }
}

