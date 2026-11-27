/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { ISearchMethods } from '@kbn/search-types';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

interface Services {
  core: CoreStart;
  search: Pick<ISearchMethods, 'esql'>;
  agentBuilder: AgentBuilderPluginStart | undefined;
  uiActions: UiActionsStart;
  filterManager: FilterManager;
}

let services: Services | undefined;

export const setServices = (
  core: CoreStart,
  search: Pick<ISearchMethods, 'esql'>,
  agentBuilder: AgentBuilderPluginStart | undefined,
  uiActions: UiActionsStart,
  filterManager: FilterManager
) => {
  services = { core, search, agentBuilder, uiActions, filterManager };
};

export const getServices = (): Services => {
  if (!services) throw new Error('CustomContent services not initialized');
  return services;
};
