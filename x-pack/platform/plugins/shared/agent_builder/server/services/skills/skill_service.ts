/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchServiceStart, Logger } from '@kbn/core/server';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { createSkillRegistry, type SkillRegistry } from './skill_registry';
import { createBuiltinSkillProvider } from './builtin_provider';
import { createPersistedSkillProvider } from './persisted';
import { createCompositeSkillRegistry } from './composite_skill_registry';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { SkillServiceSetup, SkillServiceStart } from './types';

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

export class SkillServiceImpl implements SkillService {
  readonly skillTypeRegistry: SkillRegistry;

  constructor() {
    this.skillTypeRegistry = createSkillRegistry();
  }

  setup(): SkillServiceSetup {
    return {
      registerSkill: (skill) => this.skillTypeRegistry.register(skill),
    };
  }

  start({
    elasticsearch,
    spaces,
    logger,
    getToolRegistry,
  }: SkillServiceStartDeps): SkillServiceStart {
    const builtinProvider = createBuiltinSkillProvider({
      registry: this.skillTypeRegistry,
    });

    return {
      getSkillDefinition: (skillId) => {
        return this.skillTypeRegistry.get(skillId);
      },
      listSkills: () => {
        return this.skillTypeRegistry.list();
      },
      getRegistry: async ({ request }) => {
        const space = getCurrentSpaceId({ request, spaces });
        const persistedProvider = createPersistedSkillProvider({
          logger,
          esClient: elasticsearch.client.asInternalUser,
          space,
        });
        const toolRegistry = await getToolRegistry({ request });

        return createCompositeSkillRegistry({
          builtinProvider,
          persistedProvider,
          toolRegistry,
        });
      },
    };
  }
}
