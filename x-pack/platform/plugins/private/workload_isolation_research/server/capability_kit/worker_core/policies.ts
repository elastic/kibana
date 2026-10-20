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

/**
 * Eight method:type pairs from the 7.A D replay (commit 40e0064fe45b).
 * Scoped pairs run only on a client whose provider options are an exact signature below.
 */
export const LOCAL_SO_PAIRS = {
  internal: new Set<string>([
    'get:alert',
    'update:alert',
    'get:action_task_params',
    'delete:action_task_params',
    'get:action',
  ]),
  scoped: new Set<string>([
    'get:rules-settings',
    'bulkGet:action',
    'bulkCreate:action_task_params',
  ]),
} as const;

const stringSet = (value: unknown): string | undefined => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return undefined;
  return [...new Set(value as string[])].sort().join(',');
};

/**
 * Canonical SavedObjectsClientProviderOptions. Unknown keys and non-string lists
 * return undefined so the caller bridges them.
 */
export const canonicalClientOptions = (options?: object): string | undefined => {
  if (!options) return '';
  const record = options as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => key !== 'excludedExtensions' && key !== 'includedHiddenTypes')) {
    return undefined;
  }
  const parts: string[] = [];
  if ('excludedExtensions' in record) {
    const list = stringSet(record.excludedExtensions);
    if (list === undefined) return undefined;
    parts.push(`excludedExtensions=${list}`);
  }
  if ('includedHiddenTypes' in record) {
    const list = stringSet(record.includedHiddenTypes);
    if (list === undefined) return undefined;
    parts.push(`includedHiddenTypes=${list}`);
  }
  return parts.sort().join('|');
};

/**
 * Provider-option signatures whose extension set matches the local repository:
 * security excluded, encryption still installed. Order of ids does not matter.
 * `excludedExtensions: ['security', 'encryptedSavedObjects']` is not in this set.
 * Sources: 7.A dprobe unsecured client, rules-settings unsecured client, actions
 * unsecured client (plugin.ts includedHiddenTypes, without the optional user token).
 */
export const LOCAL_SCOPED_CLIENT_OPTION_SIGNATURES = new Set<string>([
  canonicalClientOptions({
    excludedExtensions: ['security'],
    includedHiddenTypes: ['action', 'action_task_params'],
  })!,
  canonicalClientOptions({
    excludedExtensions: ['security'],
    includedHiddenTypes: ['rules-settings'],
  })!,
  canonicalClientOptions({
    excludedExtensions: ['security'],
    includedHiddenTypes: [
      'action',
      'alert',
      'action_task_params',
      'connector_ingress_credential',
      'connector_signing_key',
      'connector_token',
    ],
  })!,
]);

/** Internal repositories take no provider options. A present bag is unknown. */
export const providerOptionsAllowed = (
  target: 'internal' | 'scoped' | 'unsafeInternal',
  options?: object
): boolean => {
  const canonical = canonicalClientOptions(options);
  if (canonical === undefined) return false;
  if (target === 'internal') return canonical === '';
  if (target === 'scoped') return LOCAL_SCOPED_CLIENT_OPTION_SIGNATURES.has(canonical);
  return false;
};

export interface SoRouteInput {
  readonly localSo: boolean;
  readonly target: 'internal' | 'scoped' | 'unsafeInternal';
  readonly types: readonly string[];
  readonly registeredTypes: readonly string[];
  readonly operation?: string;
  /** SavedObjectsClientProviderOptions. Absent for createInternalRepository. */
  readonly providerOptions?: object;
  /** Per-call options. An explicit namespace bridges. */
  readonly options?: object;
  readonly defaultSpace: boolean;
}

/**
 * Local only for an 8-pair method:type and an exact provider-option signature.
 * Unknown option combinations, including excludedExtensions that also names
 * encryptedSavedObjects, bridge to main. Omit `operation` to place the client.
 */
export const routeSavedObject = (input: SoRouteInput): 'local' | 'bridge' => {
  if (!input.localSo) return 'bridge';
  if (!providerOptionsAllowed(input.target, input.providerOptions)) return 'bridge';
  if (hasExplicitNamespace(input.options)) return 'bridge';
  const registered = new Set(input.registeredTypes);
  if (input.types.length === 0 || input.types.some((type) => !registered.has(type)))
    return 'bridge';
  if (input.target === 'scoped' && !input.defaultSpace) return 'bridge';
  if (!input.operation) return 'local';
  const pairs = input.target === 'internal' ? LOCAL_SO_PAIRS.internal : LOCAL_SO_PAIRS.scoped;
  if (!input.types.every((type) => pairs.has(`${input.operation}:${type}`))) return 'bridge';
  return 'local';
};

/** Internal repositories do not accept extension hooks on the worker. An empty bag is the default. */
export const assertNoInternalRepositoryExtensions = (extensions?: object): void => {
  if (extensions && Object.keys(extensions).length > 0) {
    throw new Error('worker-core internal repository extensions are not supported');
  }
};

export const hasExplicitNamespace = (options?: object): boolean => {
  if (!options) return false;
  return ['namespace', 'namespaces', 'spaceId', 'initialNamespaces'].some(
    (key) => key in (options as Record<string, unknown>)
  );
};

/** Argument index of the options object for each saved-object client method. */
const SAVED_OBJECT_OPTION_ARGUMENT: Readonly<Record<string, number>> = {
  find: 0,
  search: 0,
  esql: 0,
  bulkGet: 1,
  bulkCreate: 1,
  bulkUpdate: 1,
  bulkDelete: 1,
  bulkResolve: 1,
  checkConflicts: 1,
  openPointInTimeForType: 1,
  get: 2,
  resolve: 2,
  delete: 2,
  create: 2,
  update: 3,
  incrementCounter: 3,
};

const asOptionBag = (value: unknown): object | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as object)
    : undefined;

const itemsCarryNamespace = (args: readonly unknown[]): boolean => {
  const objects = args[0];
  if (!Array.isArray(objects)) return false;
  return objects.some(
    (item) => item !== null && typeof item === 'object' && hasExplicitNamespace(item as object)
  );
};

/**
 * Options for one saved-object call. Bulk and checkConflicts read the options
 * argument, not the objects array. A namespace on a bulk item still bridges.
 */
export const savedObjectCallOptions = (
  method: string,
  args: readonly unknown[]
): object | undefined => {
  const index = SAVED_OBJECT_OPTION_ARGUMENT[method];
  if (index === undefined) return undefined;
  const declared = asOptionBag(args[index]);
  if (!itemsCarryNamespace(args)) return declared;
  if (declared && hasExplicitNamespace(declared)) return declared;
  return { ...(declared ?? {}), namespace: 'item' };
};

const tmPhaseStore = new AsyncLocalStorage<'boot' | 'run'>();

export const currentTmPhase = (): 'boot' | 'run' => tmPhaseStore.getStore() ?? 'run';

export const runInTmPhase = <T>(phase: 'boot' | 'run', fn: () => T): T =>
  tmPhaseStore.run(phase, fn);

/** Maintenance scheduling stays on main in both phases. */
export const ALWAYS_FENCED_TM_METHODS = ['ensureScheduled'] as const;

export const RUN_BRIDGED_TM_METHODS = [
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
] as const;

const RUN_BRIDGED = new Set<string>(RUN_BRIDGED_TM_METHODS);

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
  readonly modelVersions?: unknown;
  readonly migrations?: unknown;
}

const versionShape = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .map((key) => [key, typeof record[key] === 'function' ? 'function' : record[key]]);
};

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
        modelVersions: versionShape(type.modelVersions),
        migrations: versionShape(type.migrations),
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
    if (child && typeof child === 'object' && !Array.isArray(child))
      paths.push(...configKeyPaths(child, next));
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

/** Reads effective plugin config. A missing reader or a path error fails boot. */
export const captureEffectivePluginConfig = (
  at: ((path: string) => unknown) | undefined,
  paths: Readonly<Record<string, string>>
): { readonly effectiveConfig: Record<string, Record<string, unknown>>; readonly keyPaths: string[] } => {
  if (typeof at !== 'function') throw new Error('worker-core config capture unavailable');
  const effectiveConfig: Record<string, Record<string, unknown>> = {};
  const errors: string[] = [];
  for (const [id, path] of Object.entries(paths)) {
    try {
      const plain = toPlainConfig(at(path));
      effectiveConfig[id] =
        plain && typeof plain === 'object' && !Array.isArray(plain)
          ? (plain as Record<string, unknown>)
          : {};
    } catch (error) {
      errors.push(`${id}: ${(error as Error).name ?? 'Error'}`);
    }
  }
  if (errors.length > 0) throw new Error(`worker-core config capture failed: ${errors.join('; ')}`);
  return { effectiveConfig, keyPaths: configKeyPaths(effectiveConfig) };
};

export const CONFIG_CAPTURE_KEY = Symbol.for('kbn.research.config.atPathSync');
export const CONFIG_OBSERVE_KEY = Symbol.for('kbn.research.config.atPath');

/** Stable hash of replica content. Id lists and counts are not a substitute. */
export const contentHash = (value: unknown): string =>
  createHash('sha256').update(stableStringify(value)).digest('hex');

/**
 * Bumps generation when content changes. The first observation keeps the starting generation.
 */
export const advanceGeneration = (
  previousHash: string,
  generation: number,
  value: unknown
): { readonly hash: string; readonly generation: number } => {
  const hash = contentHash(value);
  if (hash === previousHash) return { hash, generation };
  return { hash, generation: previousHash === '' ? generation : generation + 1 };
};
