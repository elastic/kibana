/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActiveSource } from './types/connector';

/**
 * Public-facing contract for DataSources active sources service.
 */
export interface ActiveSourcesServiceStartContract {
  /**
   * List all active data sources available.
   */
  list(): Promise<ActiveSource[]>;
}

export interface DataSourcesPluginSetup {}

export interface DataSourcesPluginStart {
  /**
   * Active sources service contract, can be used to list active data sources.
   */
  activeSources: ActiveSourcesServiceStartContract;
}

export interface DataSourcesPluginSetupDependencies {}

export interface DataSourcesPluginStartDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}
