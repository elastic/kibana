/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import type { ActionTypeRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import { dataSourceUIConfigRegistry } from './registry';
import { githubUIConfig } from './github';

// Re-export registry, class, and types
export { DataSourceUIConfigRegistry, dataSourceUIConfigRegistry } from './registry';
export type { DataSourceUIConfig, DataSourceUIOverride } from './types';

/**
 * Register all data source UI configurations.
 * This must be called before registerDataSourceConnectorTypes.
 */
export function registerDataSourceUIConfigs() {
  dataSourceUIConfigRegistry.register(githubUIConfig);
  // Future: Add more configs here (Slack, Notion with custom UI, etc.)
}

/**
 * Register virtual connector types with the action registry.
 * Creates UI-only connector types for data sources that need branded forms.
 *
 * @param actionTypeRegistry - The action type registry from triggersActionsUi
 */
export function registerDataSourceConnectorTypes({
  actionTypeRegistry,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
}) {
  const configs = dataSourceUIConfigRegistry.list();

  for (const config of configs) {
    if (!config.uiOverride) continue;

    // Virtual type ID: e.g., .github_datasource
    const virtualTypeId = `.${config.dataSourceId}_datasource`;

    actionTypeRegistry.register({
      id: virtualTypeId,
      actionTypeTitle: config.uiOverride.displayName,
      iconClass: config.uiOverride.iconClass,
      selectMessage: config.uiOverride.selectMessage,
      actionConnectorFields: lazy(config.uiOverride.formComponentImport),
      actionParamsFields: lazy(() => Promise.resolve({ default: () => null })),
      validateParams: async () => ({ errors: {} }),
      connectorForm: {
        serializer: config.uiOverride.serializer,
        deserializer: config.uiOverride.deserializer,
      },
    });
  }
}
