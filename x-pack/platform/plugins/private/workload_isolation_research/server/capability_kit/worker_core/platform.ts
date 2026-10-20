/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Versioned replicas, log/audit/analytics forwarding, execution context.
 * Values that look like secrets are never placed in forwarded log text. */

import { AsyncLocalStorage } from 'async_hooks';
import { BehaviorSubject } from 'rxjs';
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

export interface PricingReplica {
  readonly available: Readonly<Record<string, boolean>>;
  readonly activeProduct?: string;
}

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

const executionContextStore = new AsyncLocalStorage<Record<string, unknown>>();

/** Applies the per-run execution context captured on main. */
export const runWithExecutionContext = <T>(context: Record<string, unknown> | undefined, fn: () => T): T =>
  context ? executionContextStore.run(context, fn) : fn();

export const currentExecutionContext = (): Record<string, unknown> | undefined =>
  executionContextStore.getStore();

export const createExecutionContextService = () => ({
  withContext: <T>(context: Record<string, unknown>, fn: () => T): T =>
    runWithExecutionContext(context, fn),
  get: () => currentExecutionContext(),
  getAsLabels: () => ({ ...(currentExecutionContext() ?? {}) }),
  set: (context: Record<string, unknown>) => {
    const store = executionContextStore.getStore();
    if (store) Object.assign(store, context);
  },
});

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

/** Lookup helpers. A miss is a miss: callers must ask main, not substitute a constant. */
export const lookupBooleanFlag = (
  replica: FeatureFlagReplica,
  key: string
): boolean | undefined => (Object.prototype.hasOwnProperty.call(replica.booleans, key) ? replica.booleans[key] : undefined);

export const createPlatformReplica = (initial: PlatformReplicas) => {
  let current = initial;
  const license$ = new BehaviorSubject(initial.license.value);
  const status$ = new BehaviorSubject(initial.status.value);
  const cache = new Map<string, unknown>();
  const apply = (next: PlatformReplicas) => {
    if (next.license.generation !== current.license.generation) license$.next(next.license.value);
    if (next.status.generation !== current.status.generation) status$.next(next.status.value);
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

export const emptyPlatformReplicas = (): PlatformReplicas => ({
  license: { generation: 1, value: {} },
  featureFlags: { generation: 1, value: emptyFlags },
  pricing: { generation: 1, value: { available: {} } },
  status: {
    generation: 1,
    value: { elasticsearch: 'available', savedObjects: 'available', overall: 'available' },
  },
  features: { generation: 1, value: { kibana: [] } },
});
