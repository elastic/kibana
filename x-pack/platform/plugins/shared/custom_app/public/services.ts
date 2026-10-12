/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';

interface Services {
  core: CoreStart;
  search: ISearchGeneric;
  embeddable: EmbeddableStart;
  /** Absent when Agent Builder is not available, in which case nothing offers chat. */
  agentBuilder: AgentBuilderPluginStart | undefined;
}

let services: Services | undefined;

export const setServices = (
  core: CoreStart,
  search: ISearchGeneric,
  embeddable: EmbeddableStart,
  agentBuilder: AgentBuilderPluginStart | undefined
) => {
  services = { core, search, embeddable, agentBuilder };
};

export const getServices = (): Services => {
  if (!services) throw new Error('CustomApp services not initialized');
  return services;
};
