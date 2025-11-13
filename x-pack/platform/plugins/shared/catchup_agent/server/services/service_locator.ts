/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { CatchupAgentPluginStart, CatchupAgentConfigType } from '../types';

let pluginServices: {
  core: CoreStart;
  plugin: CatchupAgentPluginStart;
  config: CatchupAgentConfigType;
} | null = null;

export const setPluginServices = (
  core: CoreStart,
  plugin: CatchupAgentPluginStart,
  config: CatchupAgentConfigType
) => {
  pluginServices = { core, plugin, config };
};

export const getPluginServices = () => {
  if (!pluginServices) {
    throw new Error('Plugin services not initialized');
  }
  return pluginServices;
};

export const getSpaceId = (request: KibanaRequest): string => {
  const { plugin, core } = getPluginServices();
  if (plugin.spaces) {
    return plugin.spaces.spacesService.getSpaceId(request);
  }
  // Fallback to extracting from basePath if spaces plugin not available
  const basePath = core.http.basePath.get(request);
  const match = basePath?.match(/^\/s\/([a-z0-9_\-]+)/);
  return match?.[1] || DEFAULT_SPACE_ID;
};
