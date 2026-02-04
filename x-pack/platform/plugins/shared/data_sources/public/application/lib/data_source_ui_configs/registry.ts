/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceUIConfig, DataSourceUIOverride } from './types';

/**
 * Registry for data source UI configurations.
 * Allows looking up custom UI overrides by data source ID.
 */
export class DataSourceUIConfigRegistry {
  private configs = new Map<string, DataSourceUIConfig>();

  /**
   * Register a UI configuration for a data source.
   * @param config - The UI configuration to register
   * @throws Error if a config for this data source ID is already registered
   */
  register(config: DataSourceUIConfig) {
    if (this.configs.has(config.dataSourceId)) {
      throw new Error(`UI config for data source "${config.dataSourceId}" already registered`);
    }
    this.configs.set(config.dataSourceId, config);
  }

  /**
   * Get the UI configuration for a data source.
   * @param dataSourceId - The data source identifier
   * @returns The UI config, or undefined if not found
   */
  get(dataSourceId: string): DataSourceUIConfig | undefined {
    return this.configs.get(dataSourceId);
  }

  /**
   * Get the UI override for a data source.
   * @param dataSourceId - The data source identifier
   * @returns The UI override, or undefined if not found or no override configured
   */
  getUIOverride(dataSourceId: string): DataSourceUIOverride | undefined {
    return this.configs.get(dataSourceId)?.uiOverride;
  }

  /**
   * List all registered UI configurations.
   * @returns Array of all registered configs
   */
  list(): DataSourceUIConfig[] {
    return Array.from(this.configs.values());
  }
}

/**
 * Singleton instance of the UI config registry.
 */
export const dataSourceUIConfigRegistry = new DataSourceUIConfigRegistry();
