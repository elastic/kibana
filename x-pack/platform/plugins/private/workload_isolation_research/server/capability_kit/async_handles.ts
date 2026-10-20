/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Binding } from './host';
import type { CodecInput } from './codecs';
import type { CallbackRef, HostCallContext, WorkerContext } from './protocol';

export interface ServiceHandle {
  readonly $asyncHandle: 1;
  readonly owner: 'host';
  readonly runId: string;
  readonly id: string;
}
interface HandleEntry {
  value: object;
  receiver?: object;
}
const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
const isReference = (value: CodecInput): value is ServiceHandle | CallbackRef =>
  !!value && typeof value === 'object' && '$asyncHandle' in value && value.$asyncHandle === 1;
const argsRecord = (value: CodecInput): Record<string, CodecInput> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid handle arguments');
  return value as Record<string, CodecInput>;
};

/** Exposes residual services asynchronously with owner receiver/identity and explicit run-scoped release. */
export const bindAsyncServices = (
  roots: Readonly<Record<string, object>>,
  snapshots: Readonly<Record<string, CodecInput>> = {},
  maxHandlesPerRun = 256
): Binding => {
  if (!Number.isSafeInteger(maxHandlesPerRun) || maxHandlesPerRun < 1)
    throw new Error('Invalid handle limit');
  const runs = new Map<string, Map<string, HandleEntry>>();
  const callers = new Map<string, HostCallContext>();
  const callbackOwners = new WeakMap<object, CallbackRef>();
  return {
    lever: 'capability_bundle',
    onRunEnd: (bundle) => {
      runs.delete(bundle.runId);
      callers.delete(bundle.runId);
    },
    handler: async (operation, payload, bundle, caller) => {
      if (caller) callers.set(bundle.runId, caller);
      let table = runs.get(bundle.runId);
      if (!table) {
        table = new Map();
        runs.set(bundle.runId, table);
      }
      const owned = table;
      const expose = (value: CodecInput, receiver?: object): CodecInput => {
        if (value === null || (typeof value !== 'object' && typeof value !== 'function'))
          return value;
        const callbackOwner = callbackOwners.get(value);
        if (callbackOwner) return callbackOwner;
        for (const [id, entry] of owned)
          if (entry.value === value && entry.receiver === receiver)
            return { $asyncHandle: 1, owner: 'host', runId: bundle.runId, id };
        if (owned.size >= maxHandlesPerRun) throw new Error('Service handle limit');
        const id = randomUUID();
        owned.set(id, { value, receiver });
        return { $asyncHandle: 1, owner: 'host', runId: bundle.runId, id };
      };
      const lookup = (value: CodecInput): HandleEntry => {
        if (!isReference(value) || value.owner !== 'host' || value.runId !== bundle.runId)
          throw new Error('Foreign service handle');
        const entry = owned.get(value.id);
        if (!entry) throw new Error('Service handle released or expired');
        return entry;
      };
      const materialize = (value: CodecInput, depth = 0): CodecInput => {
        if (depth > 32) throw new Error('Handle argument depth limit');
        if (isReference(value)) {
          if (value.runId !== bundle.runId) throw new Error('Foreign service/callback handle');
          if (value.owner === 'host') return lookup(value).value;
          if (!caller) throw new Error('Callback invocation unavailable');
          const runId = value.runId;
          const reference = value;
          const callback = (...args: CodecInput[]): Promise<CodecInput> => {
            const live = callers.get(runId);
            if (!live) return Promise.reject(new Error('Callback lifetime ended'));
            return live.invokeCallback(reference, args);
          };
          callbackOwners.set(callback, reference);
          return callback;
        }
        if (Array.isArray(value))
          return value.map((item: CodecInput) => materialize(item, depth + 1));
        if (
          value &&
          typeof value === 'object' &&
          Object.getPrototypeOf(value) === Object.prototype
        ) {
          return Object.fromEntries(
            Object.entries(value).map(([key, item]) => {
              if (unsafeKeys.has(key)) throw new Error('Unsafe handle key');
              return [key, materialize(item as CodecInput, depth + 1)];
            })
          );
        }
        return value;
      };
      if (operation === 'roots')
        return {
          services: Object.fromEntries(
            Object.entries(roots).map(([name, value]) => [name, expose(value)])
          ),
          snapshots,
        };
      const args = argsRecord(payload);
      if (operation === 'release') {
        lookup(args.reference);
        owned.delete((args.reference as ServiceHandle).id);
        return;
      }
      const entry = lookup(args.reference);
      if (operation === 'get') {
        if (typeof args.key !== 'string' || unsafeKeys.has(args.key))
          throw new Error('Unsafe service property');
        const value = Reflect.get(entry.value, args.key, entry.value) as CodecInput;
        return expose(value, typeof value === 'function' ? entry.value : undefined);
      }
      if (operation === 'snapshot') {
        if (!Array.isArray(args.keys) || args.keys.length > 64)
          throw new Error('Snapshot keys exceed bounds');
        return Object.fromEntries(
          args.keys.map((key: CodecInput) => {
            if (typeof key !== 'string' || unsafeKeys.has(key))
              throw new Error('Unsafe snapshot key');
            return [key, Reflect.get(entry.value, key, entry.value) as CodecInput];
          })
        );
      }
      if (operation === 'invoke') {
        if (typeof entry.value !== 'function' || !Array.isArray(args.args))
          throw new Error('Handle is not callable');
        const values = args.args.map((item: CodecInput) => materialize(item));
        return expose((await Reflect.apply(entry.value, entry.receiver, values)) as CodecInput);
      }
      throw new Error('Handle operation not allowlisted');
    },
  };
};

/** Makes every remote operation explicitly async; static metadata is a copied snapshot, never a sync RPC. */
export const createAsyncServiceClient = (context: WorkerContext, capability: string) => ({
  roots: async () =>
    context.call(capability, 'roots', {}) as Promise<{
      services: Record<string, ServiceHandle>;
      snapshots: Record<string, CodecInput>;
    }>,
  get: (reference: ServiceHandle, key: string) =>
    context.call(capability, 'get', { reference, key }),
  invoke: async (reference: ServiceHandle, args: readonly CodecInput[] = []) => {
    const value = await context.call(capability, 'invoke', { reference, args });
    return isReference(value) && value.owner === 'worker' ? context.resolveCallback(value) : value;
  },
  snapshot: (reference: ServiceHandle, keys: readonly string[]) =>
    context.call(capability, 'snapshot', { reference, keys }),
  release: (reference: ServiceHandle) => context.call(capability, 'release', { reference }),
});
