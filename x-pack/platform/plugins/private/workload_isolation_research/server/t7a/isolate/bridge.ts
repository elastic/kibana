/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Isolate-side plumbing shared by the Core-lite and plugin facades.
 * Every isolate→main call goes through `bridge()`, which resolves the CURRENT run's kit context
 * from AsyncLocalStorage (several async runs may interleave in one slot) and counts the edge.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { CodecInput } from '../../capability_kit/codecs';
import type { WorkerContext } from '../../capability_kit/protocol';

export const runContext = new AsyncLocalStorage<WorkerContext>();

/** Per-isolate edge accounting (isolate-local view; host also records crossings). */
export const edgeStats = new Map<string, { calls: number; lever: string }>();
export const fenceStats = new Map<string, number>();
export const missStats = new Map<string, number>();

export const countEdge = (edge: string, lever: string): void => {
  const entry = edgeStats.get(edge) ?? { calls: 0, lever };
  entry.calls++;
  edgeStats.set(edge, entry);
};
export const countFence = (what: string): void => {
  fenceStats.set(what, (fenceStats.get(what) ?? 0) + 1);
};

interface WireError {
  readonly __t7aError: {
    readonly message: string;
    readonly name?: string;
    readonly statusCode?: number;
    readonly soType?: string;
    readonly soId?: string;
  };
}
const isWireError = (value: unknown): value is WireError =>
  typeof value === 'object' && value !== null && '__t7aError' in value;

/** Rebuilds SO/Boom-flavoured errors so callers' `SavedObjectsErrorHelpers.is*` checks keep working. */
const reviveError = ({ __t7aError: e }: WireError): Error => {
  if (e.statusCode === 404 && e.soType) {
    return SavedObjectsErrorHelpers.createGenericNotFoundError(e.soType, e.soId);
  }
  if (e.statusCode === 409 && e.soType) {
    return SavedObjectsErrorHelpers.createConflictError(e.soType, e.soId ?? '', e.message);
  }
  const error = new Error(e.message);
  if (e.name) error.name = e.name;
  if (e.statusCode) Object.assign(error, { statusCode: e.statusCode });
  return error;
};

/** Calls a main-side capability for the current run. */
export const bridge = async <T>(capability: string, operation: string, args: CodecInput): Promise<T> => {
  const context = runContext.getStore();
  if (!context) throw new Error(`t7a bridge ${capability}.${operation} called outside a run`);
  countEdge(`${capability}.${operation}`, 'bridge');
  const value = await context.call(capability, operation, args);
  if (isWireError(value)) throw reviveError(value);
  return value as T;
};

/** Strict facade: unknown members throw a named error so the missing contract surface is explicit. */
export const strict = <T extends object>(name: string, impl: Partial<T> & object): T =>
  new Proxy(impl, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') {
        return Reflect.get(target, prop, receiver);
      }
      if (prop in target) return Reflect.get(target, prop, receiver);
      const key = `${name}.${String(prop)}`;
      missStats.set(key, (missStats.get(key) ?? 0) + 1);
      throw new Error(`T7A_UNSUPPORTED ${key}`);
    },
  }) as T;

/** Plain-data clone: keeps Date/Buffer, drops functions/undefined fields, JSON-normalises other classes. */
export const toData = (value: unknown, depth = 0): CodecInput => {
  if (depth > 60) throw new Error('t7a toData depth');
  if (value === null || value === undefined) return value as CodecInput;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value !== 'object') return value as CodecInput;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map((item) => toData(item, depth + 1) ?? null);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return JSON.parse(JSON.stringify(value)) as CodecInput;
  }
  const out: Record<string, CodecInput> = {};
  for (const [key, item] of Object.entries(value)) {
    const data = toData(item, depth + 1);
    if (data !== undefined) out[key] = data;
  }
  return out;
};
