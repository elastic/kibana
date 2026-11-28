/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { defineMigration } from './src/define_migration';
export { createMigrationRegistry } from './src/registry';
export { reconcile } from './src/reconcile';
export { reconcileAll } from './src/reconcile_all';
export { getMigrationStatus } from './src/status';
export { isGlobal, namespacesFor, resolveName } from './src/resource';
export { GLOBAL_NAMESPACE } from './src/types';
export { VERSION_META_KEY } from './src/backends/index_backend';
export { describeViolations, verifyAdditive } from './src/verify';
export {
  classifyEsError,
  describeEsRefusal,
  isMappingConflict,
  isTotalFieldsBreach,
} from './src/es_errors';
export { MUTABLE_PARAMETERS_BY_TYPE } from './src/allowlist';
export { METER_NAME } from './src/metrics';
export {
  DEFAULT_INTERVAL,
  DEFAULT_TIMEOUT,
  TASK_TYPE_PREFIX,
  taskIdFor,
  taskTypeFor,
} from './src/task';

export type {
  AdditiveVersion,
  BackingType,
  DataStepContext,
  DataVersion,
  Drift,
  ExecutionMode,
  LastRun,
  LastRunRecorded,
  MigrationDefinition,
  MigrationRegistry,
  MigrationRegistryOptions,
  MigrationResource,
  MigrationRunnerDeps,
  MigrationStartOptions,
  MigrationStatus,
  MigrationVersion,
  NamespaceStatus,
  ReconcileAllOptions,
  ReconcileOptions,
  ReconcileResult,
  ReconcileStatus,
  StatusOptions,
  VerifyResult,
  Violation,
  ViolationKind,
} from './src/types';
export type { MigrationTaskState } from './src/task';
export type { EsRefusalKind } from './src/es_errors';
