/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Versioned replicas, log/audit/analytics forwarding, execution context.
 * Values that look like secrets are never placed in forwarded log text. */

import { AsyncLocalStorage } from 'async_hooks';
import { BehaviorSubject, distinctUntilChanged, filter, map } from 'rxjs';
import type { Logger } from '@kbn/logging';

export interface ReplicaEnvelope<T> {
  readonly generation: number;
  readonly value: T;
}

export interface FeatureFlagReplica {
  readonly booleans: Readonly<Record<string, boolean>>;
  readonly strings: Readonly<Record<string, string>>;
  readonly numbers: Readonly<Record<string, number>>;
}

export interface PricingProductReplica {
  readonly type?: string;
  readonly tier?: string;
  readonly name?: string;
  readonly product_lines?: readonly string[];
}

export interface PricingReplica {
  readonly available: Readonly<Record<string, boolean>>;
  readonly activeProduct: PricingProductReplica | null;
}

/** Null is legitimate when pricing tiers are off. Non-null products keep their fields. */
export const captureActiveProduct = (product: unknown): PricingProductReplica | null => {
  if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
  const record = product as Record<string, unknown>;
  const lines = Array.isArray(record.product_lines)
    ? record.product_lines.filter((item): item is string => typeof item === 'string')
    : undefined;
  const captured: PricingProductReplica = {
    ...(typeof record.type === 'string' ? { type: record.type } : {}),
    ...(typeof record.tier === 'string' ? { tier: record.tier } : {}),
    ...(typeof record.name === 'string' ? { name: record.name } : {}),
    ...(lines ? { product_lines: lines } : {}),
  };
  return Object.keys(captured).length > 0 ? captured : null;
};

export interface StatusReplica {
  readonly elasticsearch: string;
  readonly savedObjects: string;
  readonly overall: string;
}

export interface FeaturesReplica {
  readonly kibana: readonly unknown[];
}

export interface PlatformReplicas {
  readonly license: ReplicaEnvelope<Record<string, unknown>>;
  readonly featureFlags: ReplicaEnvelope<FeatureFlagReplica>;
  readonly pricing: ReplicaEnvelope<PricingReplica>;
  readonly status: ReplicaEnvelope<StatusReplica>;
  readonly features: ReplicaEnvelope<FeaturesReplica>;
}

const SECRET_KEY = /encryptionkey|secret|password|token|authorization|apikey|credential|keystore/i;

export interface ForwardedLog {
  readonly level: string;
  readonly context: string;
  readonly message: string;
}

export interface ForwardedEvent {
  readonly sink: 'audit' | 'analytics';
  readonly payload: unknown;
}

/** Named sinks that stay on main. Everything else in the event forwarder is forwarded. */
export const NAMED_EVENT_EXCLUSIONS = [
  'usage.collector.fetch',
  'usage.collector.register',
] as const;

export interface ExecutionContextValue {
  readonly type?: string;
  readonly name?: string;
  readonly id?: string;
  readonly description?: string;
  readonly page?: string;
  readonly url?: string;
  readonly space?: string;
  readonly meta?: Readonly<Record<string, string | number | boolean | undefined>>;
  readonly child?: ExecutionContextValue;
}

const MAX_OPAQUE_CONTEXT = 1024;

const encodeContextPart = (value?: string): string => encodeURIComponent(value || '');

/** Same hierarchy string Core puts in the Elasticsearch opaque id. */
const stringifyExecutionContext = (context: ExecutionContextValue): string => {
  const current = `${encodeContextPart(context.type)}:${encodeContextPart(context.name)}:${encodeContextPart(context.id)}`;
  const encoded = context.child ? `${current};${stringifyExecutionContext(context.child)}` : current;
  return encoded.slice(0, MAX_OPAQUE_CONTEXT);
};

/** Container semantics of Core's `ExecutionContextContainer`: `toJSON` plus `toString`. */
export class ResearchExecutionContextContainer {
  readonly #context: ExecutionContextValue;

  constructor(context: ExecutionContextValue, parent?: ResearchExecutionContextContainer) {
    const parentValue = parent?.toJSON();
    this.#context = parentValue ? { ...parentValue, child: context } : context;
  }

  toJSON(): ExecutionContextValue {
    return this.#context;
  }

  toString(): string {
    return stringifyExecutionContext(this.#context);
  }
}

const executionContextStore = new AsyncLocalStorage<ResearchExecutionContextContainer>();
const requestIdStore = new AsyncLocalStorage<{ requestId: string }>();

/** Task Manager's context: task id, not the execution uuid. */
export const taskManagerExecutionContext = (
  taskType: string,
  taskId: string
): ExecutionContextValue => ({
  type: 'task manager',
  name: `run ${taskType}`,
  id: taskId,
  description: 'run task',
});

/** Applies the per-run execution context captured on main. */
export const runWithExecutionContext = <T>(
  context: ExecutionContextValue | undefined,
  fn: () => T,
  requestId?: string
): T => {
  if (!context) return fn();
  const parent = executionContextStore.getStore();
  const container = new ResearchExecutionContextContainer(context, parent);
  const run = () => executionContextStore.run(container, fn);
  return requestId ? requestIdStore.run({ requestId }, run) : run();
};

export const currentExecutionContext = (): ResearchExecutionContextContainer | undefined =>
  executionContextStore.getStore();

/** `requestId;kibana:<hierarchy>`, matching `ExecutionContextService.getAsHeader`. */
export const executionContextOpaqueId = (requestId?: string): string => {
  const id = requestId ?? requestIdStore.getStore()?.requestId ?? 'unknownId';
  const hierarchy = executionContextStore.getStore()?.toString();
  return hierarchy ? `${id};kibana:${hierarchy}` : id;
};

export const createExecutionContextService = () => ({
  withContext: <T>(context: ExecutionContextValue, fn: () => T, requestId?: string): T =>
    runWithExecutionContext(context, fn, requestId),
  get: () => currentExecutionContext(),
  getAsHeader: (requestId?: string) => executionContextOpaqueId(requestId),
  getAsLabels: () => {
    const value = currentExecutionContext()?.toJSON();
    if (!value) return {};
    const meta = value.meta
      ? Object.entries(value.meta).reduce((acc, [key, entry]) => {
          if (entry !== undefined) acc[`kibana_meta_${key}`] = entry;
          return acc;
        }, {} as Record<string, string | number | boolean>)
      : {};
    return {
      ...(value.name === undefined ? {} : { name: value.name }),
      ...(value.id === undefined ? {} : { id: value.id }),
      ...(value.page === undefined ? {} : { page: value.page }),
      ...meta,
    };
  },
  set: (context: ExecutionContextValue) => {
    executionContextStore.enterWith(new ResearchExecutionContextContainer(context));
  },
  setRequestId: (requestId: string) => {
    requestIdStore.enterWith({ requestId });
  },
});

export const LOGGER_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

/** Keeps fatal and trace. Main's child logger applies its own threshold. */
export const forwardLogLevel = (level: string): (typeof LOGGER_LEVELS)[number] =>
  (LOGGER_LEVELS as readonly string[]).includes(level)
    ? (level as (typeof LOGGER_LEVELS)[number])
    : 'info';

const textOf = (message: unknown): string => {
  if (typeof message === 'function') return textOf((message as () => unknown)());
  if (message instanceof Error) return message.stack ?? message.message;
  if (typeof message === 'string') return message;
  return String(message);
};

const redactMeta = (meta: unknown): string => {
  if (!meta || typeof meta !== 'object') return '';
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta as Record<string, unknown>)) {
    out[key] = SECRET_KEY.test(key) ? '[redacted]' : value instanceof Error ? value.message : value;
  }
  return ` ${JSON.stringify(out)}`;
};

/** Logger that forwards records to main. It does not write to stderr. */
export const createForwardingLogger = (
  context: string,
  emit: (record: ForwardedLog) => void,
  minLevel = 'trace'
): Logger => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
  const floor = levels.indexOf(minLevel as (typeof levels)[number]);
  const log = (level: (typeof levels)[number], message: unknown, meta?: unknown) => {
    if (levels.indexOf(level) < floor) return;
    emit({
      level,
      context,
      message: `${textOf(message)}${redactMeta(meta)}`.slice(0, 4000),
    });
  };
  const logger = {
    trace: (message: unknown, meta?: unknown) => log('trace', message, meta),
    debug: (message: unknown, meta?: unknown) => log('debug', message, meta),
    info: (message: unknown, meta?: unknown) => log('info', message, meta),
    warn: (message: unknown, meta?: unknown) => log('warn', message, meta),
    error: (message: unknown, meta?: unknown) => log('error', message, meta),
    fatal: (message: unknown, meta?: unknown) => log('fatal', message, meta),
    log: (record: { level: { id: string }; message: string }) =>
      log(record.level.id as (typeof levels)[number], record.message),
    isLevelEnabled: (level: string) => levels.indexOf(level as (typeof levels)[number]) >= floor,
    get: (...parts: string[]) => createForwardingLogger([context, ...parts].join('.'), emit, minLevel),
  };
  return logger as Logger;
};

export interface EventForwarder {
  readonly forwarded: () => readonly ForwardedEvent[];
  readonly excluded: () => Readonly<Record<string, number>>;
  readonly send: (sink: string, payload: unknown) => void;
}

/** Both arguments of `reportEvent`. An object event type is rejected before it can name a counter. */
export const parseAnalyticsReport = (
  eventType: unknown,
  eventData: unknown
): { readonly eventType: string; readonly eventData: Record<string, unknown> } => {
  if (typeof eventType !== 'string' || eventType.length === 0) {
    throw new Error('worker-core analytics eventType must be a string');
  }
  const data =
    eventData && typeof eventData === 'object' && !Array.isArray(eventData)
      ? (eventData as Record<string, unknown>)
      : {};
  return { eventType, eventData: data };
};

/** Main already registered the plugin's event types. A duplicate registration is not a boot failure. */
export const registerForwardedEventType = (
  register: ((definition: unknown) => void) | undefined,
  definition: unknown
): void => {
  try {
    register?.(definition);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('already registered')) throw error;
  }
};

/** Forwards audit and analytics. Usage collectors are an explicit exclusion. */
export const createEventForwarder = (
  emit: (event: ForwardedEvent) => void
): EventForwarder => {
  const forwarded: ForwardedEvent[] = [];
  const excluded: Record<string, number> = {};
  return {
    forwarded: () => forwarded,
    excluded: () => excluded,
    send: (sink, payload) => {
      if ((NAMED_EVENT_EXCLUSIONS as readonly string[]).includes(sink)) {
        excluded[sink] = (excluded[sink] ?? 0) + 1;
        return;
      }
      if (sink !== 'audit' && sink !== 'analytics') {
        throw new Error(`worker-core event sink ${sink} is not forwarded or excluded`);
      }
      const event: ForwardedEvent = { sink, payload };
      forwarded.push(event);
      emit(event);
    },
  };
};

const emptyFlags: FeatureFlagReplica = { booleans: {}, strings: {}, numbers: {} };

/** Classifies `feature_flags` config (or its `overrides` object). Absent keys stay absent. */
export const classifyFlagOverrides = (raw: unknown): FeatureFlagReplica => {
  const source =
    raw && typeof raw === 'object' && 'overrides' in raw
      ? (raw as { overrides?: unknown }).overrides
      : raw;
  const booleans: Record<string, boolean> = {};
  const strings: Record<string, string> = {};
  const numbers: Record<string, number> = {};
  const walk = (value: unknown, prefix: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof child === 'boolean') booleans[path] = child;
      else if (typeof child === 'string') strings[path] = child;
      else if (typeof child === 'number' && Number.isFinite(child)) numbers[path] = child;
      else walk(child, path);
    }
  };
  walk(source, '');
  return { booleans, strings, numbers };
};

/** Lookup helpers. A miss is a miss: callers must ask main, not substitute a constant. */
export const lookupBooleanFlag = (
  replica: FeatureFlagReplica,
  key: string
): boolean | undefined => (Object.prototype.hasOwnProperty.call(replica.booleans, key) ? replica.booleans[key] : undefined);

export const createPlatformReplica = (initial: PlatformReplicas) => {
  let current = initial;
  const license$ = new BehaviorSubject(initial.license.value);
  const status$ = new BehaviorSubject(initial.status.value);
  const featureFlags$ = new BehaviorSubject(initial.featureFlags);
  const cache = new Map<string, unknown>();
  const apply = (next: PlatformReplicas) => {
    if (next.license.generation !== current.license.generation) license$.next(next.license.value);
    if (next.status.generation !== current.status.generation) status$.next(next.status.value);
    if (next.featureFlags.generation !== current.featureFlags.generation) {
      featureFlags$.next(next.featureFlags);
    }
    if (
      next.featureFlags.generation !== current.featureFlags.generation ||
      next.pricing.generation !== current.pricing.generation ||
      next.features.generation !== current.features.generation
    ) {
      cache.clear();
    }
    current = next;
  };
  return {
    apply,
    license$,
    status$,
    generation: () => ({
      license: current.license.generation,
      featureFlags: current.featureFlags.generation,
      pricing: current.pricing.generation,
      status: current.status.generation,
      features: current.features.generation,
    }),
    booleanFlag: (key: string) => lookupBooleanFlag(current.featureFlags.value, key),
    booleanFlag$: (key: string, _fallback: boolean) =>
      featureFlags$.pipe(
        map((envelope) => lookupBooleanFlag(envelope.value, key)),
        filter((value): value is boolean => value !== undefined),
        distinctUntilChanged()
      ),
    stringFlag$: (key: string, _fallback: string) =>
      featureFlags$.pipe(
        map((envelope) =>
          Object.prototype.hasOwnProperty.call(envelope.value.strings, key)
            ? envelope.value.strings[key]
            : undefined
        ),
        filter((value): value is string => value !== undefined),
        distinctUntilChanged()
      ),
    numberFlag$: (key: string, _fallback: number) =>
      featureFlags$.pipe(
        map((envelope) =>
          Object.prototype.hasOwnProperty.call(envelope.value.numbers, key)
            ? envelope.value.numbers[key]
            : undefined
        ),
        filter((value): value is number => value !== undefined),
        distinctUntilChanged()
      ),
    stringFlag: (key: string) =>
      Object.prototype.hasOwnProperty.call(current.featureFlags.value.strings, key)
        ? current.featureFlags.value.strings[key]
        : undefined,
    numberFlag: (key: string) =>
      Object.prototype.hasOwnProperty.call(current.featureFlags.value.numbers, key)
        ? current.featureFlags.value.numbers[key]
        : undefined,
    price: (featureId: string) =>
      Object.prototype.hasOwnProperty.call(current.pricing.value.available, featureId)
        ? current.pricing.value.available[featureId]
        : undefined,
    activeProduct: () => current.pricing.value.activeProduct,
    features: () => current.features.value.kibana,
    remember: (key: string, value: unknown) => {
      cache.set(`${current.featureFlags.generation}:${key}`, value);
    },
    remembered: (key: string) => cache.get(`${current.featureFlags.generation}:${key}`),
  };
};

/** Resolves waiters whose seen fingerprint is no longer current. An unchanged publish waits. */
export const createReplicaWaitQueue = () => {
  const pending: Array<{ seen: string; resolve: (fingerprint: string) => void }> = [];
  const drop = (entry: { seen: string; resolve: (fingerprint: string) => void }): void => {
    const index = pending.indexOf(entry);
    if (index >= 0) pending.splice(index, 1);
  };
  return {
    size: () => pending.length,
    wait: (seen: string, signal?: AbortSignal) =>
      new Promise<string>((resolve) => {
        const entry = { seen, resolve };
        const finish = () => {
          drop(entry);
          resolve(seen);
        };
        if (signal?.aborted) {
          finish();
          return;
        }
        pending.push(entry);
        signal?.addEventListener('abort', finish, { once: true });
      }),
    publish: (fingerprint: string) => {
      const ready = pending.filter((item) => item.seen !== fingerprint);
      const still = pending.filter((item) => item.seen === fingerprint);
      pending.length = 0;
      pending.push(...still);
      for (const item of ready) item.resolve(fingerprint);
    },
  };
};

export const replicaFingerprint = (generation: {
  readonly license: number;
  readonly featureFlags: number;
  readonly pricing: number;
  readonly status: number;
  readonly features: number;
}): string =>
  `license:${generation.license}|featureFlags:${generation.featureFlags}|pricing:${generation.pricing}|status:${generation.status}|features:${generation.features}`;

export const emptyPlatformReplicas = (): PlatformReplicas => ({
  license: { generation: 1, value: {} },
  featureFlags: { generation: 1, value: emptyFlags },
  pricing: { generation: 1, value: { available: {}, activeProduct: null } },
  status: {
    generation: 1,
    value: { elasticsearch: 'available', savedObjects: 'available', overall: 'available' },
  },
  features: { generation: 1, value: { kibana: [] } },
});
