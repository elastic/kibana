/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Saved-object routing, Task Manager phase policy, migration readiness,
 * and config redaction (keys only). */

import { AsyncLocalStorage } from 'async_hooks';
import { createHash } from 'crypto';

/** Operations the alerting island has demonstrated locally (internal user, or security excluded). */
export const LOCAL_SO_OPERATIONS = [
  'get',
  'bulkGet',
  'create',
  'bulkCreate',
  'update',
  'bulkUpdate',
  'delete',
  'bulkDelete',
  'find',
  'checkConflicts',
] as const;

const LOCAL_OP_SET = new Set<string>(LOCAL_SO_OPERATIONS);

export interface SoRouteInput {
  readonly localSo: boolean;
  readonly target: 'internal' | 'scoped' | 'unsafeInternal';
  readonly types: readonly string[];
  readonly registeredTypes: readonly string[];
  readonly operation?: string;
  readonly options?: object;
  readonly defaultSpace: boolean;
  readonly securityExcluded: boolean;
}

/** Local only for the explicit operation list, registered types, and the demonstrated space/security case. */
export const routeSavedObject = (input: SoRouteInput): 'local' | 'bridge' => {
  if (!input.localSo) return 'bridge';
  if (input.target === 'unsafeInternal') return 'bridge';
  if (input.operation && !LOCAL_OP_SET.has(input.operation)) return 'bridge';
  if (hasExplicitNamespace(input.options)) return 'bridge';
  const registered = new Set(input.registeredTypes);
  if (input.types.length === 0 || input.types.some((type) => !registered.has(type))) return 'bridge';
  if (input.target === 'scoped' && !(input.securityExcluded && input.defaultSpace)) return 'bridge';
  return 'local';
};

export const hasExplicitNamespace = (options?: object): boolean => {
  if (!options) return false;
  return ['namespace', 'namespaces', 'spaceId', 'initialNamespaces'].some(
    (key) => key in (options as Record<string, unknown>)
  );
};

const tmPhaseStore = new AsyncLocalStorage<'boot' | 'run'>();

export const currentTmPhase = (): 'boot' | 'run' => tmPhaseStore.getStore() ?? 'run';

export const runInTmPhase = <T>(phase: 'boot' | 'run', fn: () => T): T => tmPhaseStore.run(phase, fn);

/** Maintenance scheduling stays on main in both phases. */
export const ALWAYS_FENCED_TM_METHODS = ['ensureScheduled'] as const;

const RUN_BRIDGED = new Set([
  'schedule',
  'bulkSchedule',
  'aggregate',
  'fetch',
  'get',
  'runSoon',
  'removeIfExists',
  'bulkRemove',
  'bulkDisable',
  'bulkEnable',
  'bulkUpdateSchedules',
  'bulkUpdateState',
]);

/**
 * Boot phase fences every Task Manager call. Run phase bridges the run-time methods
 * for every task type (no `actions:*` prefix). `ensureScheduled` stays fenced.
 */
export const decideTaskManagerCall = (
  method: string,
  phase: 'boot' | 'run' = currentTmPhase()
): 'fence' | 'bridge' => {
  if ((ALWAYS_FENCED_TM_METHODS as readonly string[]).includes(method)) return 'fence';
  if (phase === 'boot') return 'fence';
  return RUN_BRIDGED.has(method) ? 'bridge' : 'fence';
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
};

export interface SoTypeFingerprintInput {
  readonly name: string;
  readonly mappings?: unknown;
  readonly namespaceType?: unknown;
  readonly hidden?: boolean;
  readonly indexPattern?: string;
}

/** Stable hash of the saved-object type fields that define index compatibility. */
export const fingerprintSavedObjectType = (type: SoTypeFingerprintInput): string =>
  createHash('sha256')
    .update(
      stableStringify({
        name: type.name,
        namespaceType: type.namespaceType ?? null,
        hidden: type.hidden === true,
        indexPattern: type.indexPattern ?? null,
        mappings: type.mappings ?? null,
      })
    )
    .digest('hex');

export interface ReadinessToken {
  readonly generation: number;
  readonly fingerprints: Readonly<Record<string, string>>;
}

/** Fails closed when the worker's type registry does not match the token main minted. */
export const verifyRegistryReadiness = (
  token: ReadinessToken | undefined,
  registered: readonly SoTypeFingerprintInput[]
): void => {
  if (!token || !Number.isInteger(token.generation) || token.generation < 1) {
    throw new Error('worker-core readiness token missing');
  }
  if (registered.length === 0) return;
  for (const type of registered) {
    const expected = token.fingerprints[type.name];
    const actual = fingerprintSavedObjectType(type);
    if (expected !== actual) {
      throw new Error(`worker-core readiness mismatch for saved object type ${type.name}`);
    }
  }
};

const SECRET_KEY = /secret|password|token|authorization|apikey|credential|keystore|encryptionkey/i;

/** Key paths only. Values are omitted so config cannot reach a log line. */
export const configKeyPaths = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object') return prefix ? [prefix] : [];
  if (Array.isArray(value)) return prefix ? [prefix] : [];
  const paths: string[] = [];
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const child = (value as Record<string, unknown>)[key];
    if (child && typeof child === 'object' && !Array.isArray(child)) paths.push(...configKeyPaths(child, next));
    else paths.push(next);
  }
  return paths;
};

/** Plain JSON suitable for schema validation. Rejects functions. Does not log the value. */
export const toPlainConfig = (value: unknown, depth = 0): unknown => {
  if (depth > 30) throw new Error('worker-core config capture exceeded depth');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
    throw new Error('worker-core config capture rejected a non-data value');
  }
  if (Array.isArray(value)) return value.map((item) => toPlainConfig(item, depth + 1));
  if (typeof (value as { toJSON?: () => unknown }).toJSON === 'function') {
    return toPlainConfig((value as { toJSON: () => unknown }).toJSON(), depth + 1);
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key) && (typeof child === 'string' || typeof child === 'number')) {
      out[key] = child;
    } else {
      out[key] = toPlainConfig(child, depth + 1);
    }
  }
  return out;
};

export const CONFIG_CAPTURE_KEY = Symbol.for('kbn.research.config.atPathSync');
