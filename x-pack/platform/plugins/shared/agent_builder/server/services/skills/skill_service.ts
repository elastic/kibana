/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import { createClient } from './client';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';
import { createSkillRegistry } from './skill_registry';
import type { SkillProvider, SkillRegistry } from './skill_registry';
import { persistedSkillToPublicDefinition } from './utils';

export interface SkillServiceSetup {
  registerSkill(skill: SkillDefinition): Promise<void>;
}

export interface SkillServiceStart {
  /**
   * Returns the list of registered built-in skill definitions.
   */
  listSkills(): SkillDefinition[];
  /**
   * Returns the built-in skill definition for a given skill id, or undefined.
   */
  getSkillDefinition(skillId: string): SkillDefinition | undefined;
  /**
   * Create a skill registry scoped to the current user and context.
   * The registry provides access to both built-in and persisted skills.
   */
  getRegistry(opts: { request: KibanaRequest }): Promise<SkillRegistry>;
}

export interface SkillService {
  setup: () => SkillServiceSetup;
  start: (deps: SkillServiceStartDeps) => SkillServiceStart;
}

export interface SkillServiceStartDeps {
  elasticsearch: ElasticsearchServiceStart;
  spaces?: SpacesPluginStart;
  logger: Logger;
  getToolRegistry: (opts: { request: KibanaRequest }) => Promise<ToolRegistry>;
}

export const createSkillService = (): SkillService => {
  return new SkillServiceImpl();
};

class SkillServiceImpl implements SkillService {
  private readonly skills: Map<string, SkillDefinition> = new Map();
  private readonly skillFullPaths: Set<string> = new Set();

  setup(): SkillServiceSetup {
    return {
      registerSkill: async (skill) => {
        await validateSkillDefinition(skill);

        if (this.skills.has(skill.id)) {
          throw new Error(`Skill type with id ${skill.id} already registered`);
        }

        const fullPath = getSkillEntryPath({ skill });
        if (this.skillFullPaths.has(fullPath)) {
          throw new Error(
            `Skill with path ${skill.basePath} and name ${skill.name} already registered`
          );
        }
        this.skillFullPaths.add(fullPath);
        this.skills.set(skill.id, skill);
      },
    };
  }

  start({
    elasticsearch,
    spaces,
    logger,
    getToolRegistry,
  }: SkillServiceStartDeps): SkillServiceStart {
    return {
      listSkills: () => [...this.skills.values()],
      getSkillDefinition: (skillId) => this.skills.get(skillId),
      getRegistry: async ({ request }) => {
        const space = getCurrentSpaceId({ request, spaces });
        const esClient = elasticsearch.client.asInternalUser;
        const skillClient = createClient({ space, esClient, logger });

        const persistedProvider: SkillProvider = {
          id: 'persisted',
          async has(skillId: string) {
            return skillClient.has(skillId);
          },
          async get(skillId: string) {
            try {
              const skill = await skillClient.get(skillId);
              return persistedSkillToPublicDefinition(skill);
            } catch {
              return undefined;
            }
          },
          async list() {
            const skills = await skillClient.list();
            return skills.map(persistedSkillToPublicDefinition);
          },
          async create(createRequest) {
            const skill = await skillClient.create(createRequest);
            return persistedSkillToPublicDefinition(skill);
          },
          async update(skillId, updateRequest) {
            const skill = await skillClient.update(skillId, updateRequest);
            return persistedSkillToPublicDefinition(skill);
          },
          async delete(skillId: string) {
            return skillClient.delete(skillId);
          },
        };

        const toolRegistry = await getToolRegistry({ request });

        return createSkillRegistry({
          builtinSkills: [...this.skills.values()],
          persistedProvider,
          toolRegistry,
        });
      },
    };
  }
}
