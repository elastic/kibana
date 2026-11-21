/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

/**
 * Who triggers a migration. The library always owns *how* it runs - locking,
 * idempotency, retry, status and metrics. The consumer only chooses *when*.
 */
export type ExecutionMode =
  /**
   * A background task runs it unattended. Requires the consumer to supply its own Task
   * Manager at registration, which is what lets a package own a task without becoming a
   * plugin - and gives once-per-cluster execution for free via the task claim.
   */
  | 'auto'
  /**
   * The consumer calls `reconcile` itself, from wherever it chooses - plugin start, an
   * install step, or an operator-facing route.
   *
   * Deliberately one mode rather than separate values for startup and on-request. The
   * library behaves identically either way, so splitting them would describe a
   * difference that does not exist and invite someone to rely on it.
   */
  | 'manual';

/**
 * A change that only ever adds to the index shape. Applied automatically.
 *
 * There is deliberately no `breaking` kind: a change Elasticsearch cannot apply
 * in place is performed by decomposing it into additive and data steps across
 * releases, never by declaring it.
 */
export interface AdditiveVersion {
  change: 'additive';
  /** The complete expected mappings at this version, not a delta. */
  mappings: MappingTypeMapping;
}

/** A change to the documents themselves. Declared and ordered here, executed by the plugin. */
export interface DataVersion {
  change: 'data';
  run: (context: DataStepContext) => Promise<void>;
}

export type MigrationVersion = AdditiveVersion | DataVersion;

export interface DataStepContext {
  esClient: ElasticsearchClient;
  logger: Logger;
  /** The resolved concrete resource name for the namespace being reconciled. */
  resourceName: string;
  namespace: string;
  /**
   * Aborted on task timeout or Kibana shutdown. A backfill is the most likely step to
   * outlive its timeout, so pass this to every request it makes.
   */
  signal?: AbortSignal;
}

/**
 * How the resource is backed, which decides what a declared field removal means.
 *
 * On a rolling template the field simply stops appearing in new backing indices, so the
 * removal costs nothing. On a live concrete index Elasticsearch keeps the field, so the
 * declaration and the index quietly diverge and that is worth reporting.
 */
export type BackingType = 'concrete_index' | 'rolling_template';

interface ResourceCommon {
  /** Only concrete indices for now; data streams and templates follow. */
  kind: 'index';
  /** Defaults to `concrete_index`, the conservative reading. */
  backing?: BackingType;
}

/**
 * Where a resource lives relative to spaces.
 *
 * A discriminated union rather than a flag, so a `global` resource cannot reference a
 * namespace at all - the type rejects it instead of relying on the author to remember.
 * Getting this wrong is otherwise invisible: a global index reconciled per namespace
 * still ends up correct, because the first pass stamps the version and the rest no-op,
 * while quietly costing a request pair per space and over-counting every metric.
 */
export type MigrationResource =
  | (ResourceCommon & {
      /** One resource per space. The default, and the common case. */
      scope?: 'namespace';
      name: (namespace: string) => string;
    })
  | (ResourceCommon & {
      /** One resource shared by every space. Reconciled once, not per namespace. */
      scope: 'global';
      name: () => string;
    });

/** The namespace a global resource reports under, since it belongs to none of them. */
export const GLOBAL_NAMESPACE = '*';

export type ViolationKind =
  | 'type_changed'
  | 'parameter_immutable'
  | 'structural_immutable'
  | 'subfield_removed'
  | 'subfield_retyped';

/** A difference Elasticsearch will not apply in place. */
export interface Violation {
  path: string;
  kind: ViolationKind;
  detail: string;
}

/** A difference that is applied, but leaves the declaration out of step with reality. */
export interface Drift {
  path: string;
  kind: 'field_removed';
  detail: string;
}

export interface VerifyResult {
  ok: boolean;
  violations: Violation[];
  drift: Drift[];
}

export interface MigrationDefinition {
  /** Stable identifier. Every log line, metric and status entry is labelled with it. */
  id: string;
  resource: MigrationResource;
  /**
   * Version to assume for a resource that carries no stamp. Resources created before
   * this library existed have none, so this is what makes adoption possible without
   * touching live deployments first.
   */
  baseline: number;
  execution: ExecutionMode;
  /** Keyed by version number. Each entry describes the step from the previous version to this one. */
  versions: Readonly<Record<number, MigrationVersion>>;
}

/**
 * The set of migrations one plugin has declared.
 *
 * Enumeration is what a status surface and the version-gap metric both need - neither
 * can be assembled from scattered call sites.
 */
export interface MigrationRegistryOptions {
  /** Names the task type and task id, so one plugin owns exactly one of each. */
  pluginId: string;
  /**
   * Required for `auto` migrations. Supplied by the consumer because a package has no
   * lifecycle of its own, and must be the *setup* contract - the only one Task Manager
   * accepts a task definition from.
   */
  taskManager?: TaskManagerSetupContract;
  /**
   * How long one run may take before Task Manager kills it. Set it here rather than
   * accept the default when migrations are heavier (a large backfill, many namespaces)
   * or trivially fast. Belongs at setup because it is part of the task definition.
   *
   * Format `{number}{s|m|h|d}`. Defaults to `10m`.
   */
  timeout?: string;
}

export interface MigrationStartOptions extends MigrationRunnerDeps {
  taskManager: TaskManagerStartContract;
  /**
   * How often the sweep runs. Migrations arrive on upgrade, so this is a safety net
   * rather than the delivery mechanism. Defaults to `60m`.
   */
  interval?: string;
}

export interface MigrationRegistry {
  /**
   * Throws if a different migration already holds the id, if the definition declares
   * `auto` without a taskManager, or if called after `start()`.
   */
  register: (definition: MigrationDefinition) => void;
  /** Call during plugin start. Schedules the task when `auto` migrations are present. */
  start: (options: MigrationStartOptions) => Promise<void>;
  get: (id: string) => MigrationDefinition | undefined;
  has: (id: string) => boolean;
  all: () => MigrationDefinition[];
  readonly size: number;
}

export type ReconcileStatus =
  /** Installed version already matches the target. */
  | 'up_to_date'
  /** The resource did not exist and was created at the target version. */
  | 'created'
  /** One or more steps were applied. */
  | 'migrated'
  /** A step threw. The resource is left stamped at the last version that succeeded. */
  | 'failed';

export interface ReconcileResult {
  migrationId: string;
  resourceName: string;
  namespace: string;
  status: ReconcileStatus;
  /** Version found on the resource before this run, or `baseline` when unstamped. */
  installed: number;
  target: number;
  /** Versions applied by this run, in order. */
  applied: number[];
  error?: string;
}

export interface ReconcileOptions {
  definition: MigrationDefinition;
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
  /** Aborted on task timeout or shutdown; passed to every Elasticsearch request. */
  signal?: AbortSignal;
}

export interface ReconcileAllOptions {
  definition: MigrationDefinition;
  esClient: ElasticsearchClient;
  logger: Logger;
  /** Every namespace to reconcile. One failure does not stop the rest. */
  namespaces: string[];
  signal?: AbortSignal;
}

export interface StatusOptions {
  definition: MigrationDefinition;
  esClient: ElasticsearchClient;
  namespaces: string[];
  /** The `auto` task's recorded outcome, when the caller has it. */
  lastRun?: LastRun;
  signal?: AbortSignal;
}

export interface NamespaceStatus {
  namespace: string;
  resourceName: string;
  exists: boolean;
  /** Undefined when the resource does not exist yet. */
  installed: number | undefined;
  versionsBehind: number;
}

/**
 * Whether a last-run record could exist at all.
 *
 * Distinguishing these matters: on a non-`auto` migration a missing error means no record
 * was kept, not that the run succeeded.
 */
export type LastRunRecorded =
  /** An `auto` migration that has run. */
  | 'yes'
  /** An `auto` migration that has not run yet. */
  | 'never_run'
  /** Not an `auto` migration, so no record is kept - check the plugin's own logs. */
  | 'not_applicable';

export interface MigrationStatus {
  migrationId: string;
  execution: ExecutionMode;
  target: number;
  namespaces: NamespaceStatus[];
  /** The furthest behind any namespace is. Sustained above zero means stuck. */
  versionsBehind: number;
  lastRunRecorded: LastRunRecorded;
  lastRun?: LastRun;
}

/**
 * What one `auto` sweep did, kept so an unattended failure is still answerable later.
 *
 * A fixed-size summary rather than a record per namespace. Task Manager reads and writes
 * task state on every cycle, so anything that grows with space count belongs somewhere
 * else - and per-namespace detail already arrives through metrics, which carry a
 * namespace attribute and keep full history without us storing any.
 */
export interface LastRun {
  at: string;
  /** Resources reconciled this sweep - namespaces, or 1 for a global resource. */
  total: number;
  failed: number;
  /** Target version the sweep was working towards. */
  target: number;
  /** Lowest version any resource was left at, so a stuck space is visible. */
  lowestInstalled: number;
  /** The first failure, as a worked example. Metrics hold the rest. */
  firstError?: {
    namespace: string;
    version: number;
    error: string;
  };
}

/**
 * Supplied by the consumer at start.
 *
 * The package asks for these rather than reaching for them, which is what keeps it free
 * of a `spaces` dependency and lets it own a task without becoming a plugin.
 */
export interface MigrationRunnerDeps {
  getEsClient: () => Promise<ElasticsearchClient> | ElasticsearchClient;
  /** Every namespace to reconcile. One definition covers all of them. */
  getNamespaces: () => Promise<string[]> | string[];
  logger: Logger;
}
