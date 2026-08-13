/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

interface Services {
  core: CoreStart;
  search: ISearchGeneric;
  agentBuilder: AgentBuilderPluginStart | undefined;
}

let services: Services | undefined;

export const setServices = (
  core: CoreStart,
  search: ISearchGeneric,
  agentBuilder: AgentBuilderPluginStart | undefined
) => {
  services = { core, search, agentBuilder };
};

export const getServices = (): Services => {
  if (!services) throw new Error('CustomContent services not initialized');
  return services;
};
