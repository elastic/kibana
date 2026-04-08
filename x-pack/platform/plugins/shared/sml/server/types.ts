/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SmlTypeDefinition, SmlService } from './services';

export interface SmlSetupDependencies {
  taskManager: TaskManagerSetupContract;
}

export interface SmlStartDependencies {
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
}

/**
 * SML plugin setup contract.
 * Used by consumers to register SML type definitions during plugin setup.
 */
export interface SmlPluginSetup {
  /**
   * Register an SML type definition.
   * Solutions can register their content types to make them discoverable via SML.
   */
  registerType: (definition: SmlTypeDefinition) => void;
}

/**
 * SML plugin start contract.
 * Provides access to the SML service for searching, indexing, and managing SML data.
 */
export type SmlPluginStart = SmlService;
