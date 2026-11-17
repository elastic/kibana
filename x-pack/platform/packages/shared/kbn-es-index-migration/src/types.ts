/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';

/**
 * Who triggers a migration. The library always owns *how* it runs - locking,
 * idempotency, retry, status and metrics. The consumer only chooses *when*.
 *
 * A planned third mode, `auto`, would have a shared background task run migrations
 * unattended. It is deliberately absent: running migrations nobody asked for requires
 * a registry that spans plugins and owns a Kibana lifecycle, which a package cannot
 * provide. Declaring it before it works would promise behaviour that silently does
 * nothing.
 */
export type ExecutionMode =
  /** The plugin calls `reconcile` from its own lifecycle. */
  | 'lifecycle'
  /** Runs only when an operator or an API invokes it. */
  | 'triggered';

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
}

export interface MigrationResource {
  /** Only concrete indices for now; data streams and templates follow. */
  kind: 'index';
  /** Resolves the concrete name for a namespace, so one definition covers every space. */
  name: (namespace: string) => string;
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
export interface MigrationRegistry {
  /** Throws if a different migration is already registered under the same id. */
  register: (definition: MigrationDefinition) => void;
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
}
