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
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';
import { createSkillRegistry } from './skill_registry';
import type { SkillRegistry } from './skill_registry';
import { createBuiltinSkillProvider } from './builtin';
import { createPersistedSkillProvider } from './persisted';

export interface SkillServiceSetup {
  registerSkill(skill: SkillDefinition): Promise<void>;
}

export interface SkillServiceStart {
  /**
   * Create a skill registry scoped to the current user and context.
   * The registry provides access to both built-in and persisted skills.
   * This is the single entry point for all skill access.
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
      getRegistry: async ({ request }) => {
        const space = getCurrentSpaceId({ request, spaces });
        const builtinProvider = createBuiltinSkillProvider([...this.skills.values()]);
        const persistedProvider = createPersistedSkillProvider({
          space,
          esClient: elasticsearch.client.asInternalUser,
          logger,
        });
        const toolRegistry = await getToolRegistry({ request });

        return createSkillRegistry({
          builtinProvider,
          persistedProvider,
          toolRegistry,
        });
      },
    };
  }
}
