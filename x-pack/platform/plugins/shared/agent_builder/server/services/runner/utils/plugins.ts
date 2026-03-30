/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginsService } from '@kbn/agent-builder-server/runner';
import type { PluginsServiceStart } from '../../plugins/plugin_service';

export const createPluginsService = ({
  pluginsServiceStart,
  request,
}: {
  pluginsServiceStart: PluginsServiceStart;
  request: KibanaRequest;
}): PluginsService => {
  return {
    resolveSkillIds: async (pluginIds: string[]): Promise<string[]> => {
      if (pluginIds.length === 0) return [];
      const registry = pluginsServiceStart.getRegistry({ request });
      const results = await Promise.all(pluginIds.map((id) => registry.get(id).catch(() => null)));
      return results
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .flatMap((p) => p.skill_ids);
    },
  };
};
