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
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import { createClient } from './client';
import { getCurrentSpaceId } from '../../utils/spaces';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';
import { createSkillRegistry } from './skill_registry';
import type { SkillProvider, SkillRegistry } from './skill_registry';

const toPublicDefinition = (skill: {
  id: string;
  name: string;
  description: string;
  content: string;
  referenced_content?: Array<{
    name: string;
    relativePath: string;
    content: string;
  }>;
  tool_ids?: string[];
}): PublicSkillDefinition => {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    content: skill.content,
    referenced_content: skill.referenced_content,
    tool_ids: skill.tool_ids,
    readonly: false,
  };
};

export interface SkillServiceSetup {
  registerSkill(skill: SkillDefinition): Promise<void>;
}

export interface SkillServiceStart {
  /**
   * Create a skill registry scoped to the current user and context.
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
              return toPublicDefinition(skill);
            } catch {
              return undefined;
            }
          },
          async list() {
            const skills = await skillClient.list();
            return skills.map(toPublicDefinition);
          },
          async create(createRequest) {
            const skill = await skillClient.create(createRequest);
            return toPublicDefinition(skill);
          },
          async update(skillId, updateRequest) {
            const skill = await skillClient.update(skillId, updateRequest);
            return toPublicDefinition(skill);
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
