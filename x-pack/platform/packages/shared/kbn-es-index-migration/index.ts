/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defineMigration } from './src/define_migration';
export { createMigrationRegistry } from './src/registry';
export { reconcile } from './src/reconcile';
export { VERSION_META_KEY } from './src/backends/index_backend';

export type {
  AdditiveVersion,
  DataStepContext,
  DataVersion,
  ExecutionMode,
  MigrationDefinition,
  MigrationRegistry,
  MigrationResource,
  MigrationVersion,
  ReconcileOptions,
  ReconcileResult,
  ReconcileStatus,
} from './src/types';
