/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsServiceStart, SavedObjectsServiceStart } from '@kbn/core/server';
import { AgentType, createAgentNotFoundError } from '@kbn/onechat-common';
import type { BuiltInAgentDefinition } from '@kbn/onechat-server/agents';
import type { BuiltinAgentRegistry } from './registry';
import type { AgentProviderFn, ReadonlyAgentProvider } from '../agent_source';
import type { InternalAgentDefinition } from '../agent_registry';

export const createBuiltinProviderFn =
  ({
    registry,
    uiSettings,
    savedObjects,
  }: {
    registry: BuiltinAgentRegistry;
    uiSettings: UiSettingsServiceStart;
    savedObjects: SavedObjectsServiceStart;
  }): AgentProviderFn<true> =>
  async ({ request }) => {
    // Evaluate all isEnabled checks upfront
    const definitions = registry.list();
    const enabledAgentIds = new Set<string>();

    for (const definition of definitions) {
      const isEnabled = definition.isEnabled
        ? await definition.isEnabled({ request, uiSettings, savedObjects })
        : true;

      if (isEnabled) {
        enabledAgentIds.add(definition.id);
      }
    }

    return registryToProvider({ registry, enabledAgentIds });
  };

const registryToProvider = ({
  registry,
  enabledAgentIds,
}: {
  registry: BuiltinAgentRegistry;
  enabledAgentIds: Set<string>;
}): ReadonlyAgentProvider => {
  return {
    id: 'builtin',
    readonly: true,
    has: (agentId: string) => {
      return registry.has(agentId) && enabledAgentIds.has(agentId);
    },
    get: (agentId: string) => {
      const definition = registry.get(agentId);
      if (!definition) {
        throw createAgentNotFoundError({ agentId });
      }
      if (!enabledAgentIds.has(agentId)) {
        throw createAgentNotFoundError({ agentId });
      }
      return toInternalDefinition({ definition });
    },
    list: () => {
      const definitions = registry.list();
      return Promise.all(
        definitions
          .filter((definition) => enabledAgentIds.has(definition.id))
          .map((definition) => toInternalDefinition({ definition }))
      );
    },
  };
};

export const toInternalDefinition = async ({
  definition,
}: {
  definition: BuiltInAgentDefinition;
}): Promise<InternalAgentDefinition> => {
  return {
    ...definition,
    type: AgentType.chat,
    readonly: true,
  };
};
