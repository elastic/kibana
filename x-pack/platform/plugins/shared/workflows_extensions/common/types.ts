/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonStepDefinition } from './step_registry/types';

/**
 * Common contract for workflows extensions start.
 * Exposes methods for retrieving registered step definitions.
 */
export interface WorkflowsExtensionsStartContract<TStepDefinition extends CommonStepDefinition> {
  /**
   * Get all registered step definition.
   * @returns Array of all registered step definition
   */
  getAllStepDefinitions(): TStepDefinition[];

  /**
   * Get definition for a specific step type.
   * @param stepTypeId - The step type identifier
   * @returns The step definition, or undefined if not found
   */
  getStepDefinition(stepTypeId: string): TStepDefinition | undefined;

  /**
   * Check if definition for a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if definition for the step type is registered, false otherwise
   */
  hasStepDefinition(stepTypeId: string): boolean;

  /**
   * Resolves when all async loaders have settled.
   * Check before using the extensions to guarantee the registries are ready.
   */
  isReady(): Promise<void>;
}
