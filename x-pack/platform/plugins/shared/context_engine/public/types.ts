/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ContextEngineSearchNavigationAdapter } from './search_navigation_adapter';

export type { ContextEngineSearchNavigationAdapter } from './search_navigation_adapter';

export interface ContextEnginePluginSetup {
  registerSearchNavigationAdapter: (adapter: ContextEngineSearchNavigationAdapter) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEnginePluginStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContextEngineSetupDependencies {}

export interface ContextEngineStartDependencies {
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  console?: ConsolePluginStart;
}

export interface ContextEngineServicesContextDeps {
  history: AppMountParameters['history'];
  searchNavigation?: ContextEngineSearchNavigationAdapter;
}

export type ContextEngineAppServices = CoreStart & ContextEngineServicesContextDeps;
