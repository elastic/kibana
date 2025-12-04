/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';

import type {
  AgentSkillsPluginSetupDeps,
  AgentSkillsPluginStartDeps,
} from './types';
import { Skill } from '@kbn/agent-skills-common';

export interface AgentSkillsPluginSetup {
  /**
   * Register a skill that can be consumed by other plugins.
   * @param skill - The skill instance to register
   */
  registerSkill(skill: Skill): void;
}

export interface AgentSkillsPluginStart {
  /**
   * Get all registered skills.
   * @returns Array of all registered skills
   */
  getSkills(): Skill[];
}

export class AgentSkillsPlugin
  implements
    Plugin<
      AgentSkillsPluginSetup,
      AgentSkillsPluginStart,
      AgentSkillsPluginSetupDeps,
      AgentSkillsPluginStartDeps
    >
{
  private readonly logger: Logger;
  private readonly skills: Skill[] = [];

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: AgentSkillsPluginSetupDeps): AgentSkillsPluginSetup {
    this.logger.debug('Setting up AgentSkills plugin');

    return {
      registerSkill: (skill: Skill) => {
        // Check if a skill with the same ID is already registered
        const existingSkill = this.skills.find((s) => s.id === skill.id);
        if (existingSkill) {
          this.logger.warn(
            `Skill with id "${skill.id}" is already registered. Overwriting existing skill.`
          );
          const index = this.skills.indexOf(existingSkill);
          this.skills[index] = skill;
        } else {
          this.skills.push(skill);
          this.logger.debug(`Registered skill: ${skill.id} (${skill.name})`);
        }
      },
    };
  }

  public start(core: CoreStart, plugins: AgentSkillsPluginStartDeps): AgentSkillsPluginStart {
    this.logger.debug('Starting AgentSkills plugin');

    return {
      getSkills: () => {
        return [...this.skills];
      },
    };
  }

  public stop() {
    this.logger.debug('Stopping AgentSkills plugin');
    this.skills.length = 0;
  }
}

