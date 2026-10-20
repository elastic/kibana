/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CodecInput } from './codecs';
import type { Binding } from './host';
import type { Lever, WorkerContext } from './protocol';

export interface ServiceBinderOptions {
  /** Explicit method allowlist; anything else fails closed. */
  readonly operations: readonly string[];
  /** Worker sends an argument array that is spread as positional parameters. */
  readonly positional?: boolean;
  /** FIFO per run (e.g. logger/audit/event side effects). */
  readonly ordered?: boolean;
  /** Drop return values (fire-and-forget style APIs such as loggers). */
  readonly discardResult?: boolean;
  /**
   * Inject the run's main-side AbortSignal into the LAST object argument under `key`
   * (default 'signal') for these operations, so main work stops when the run is terminated.
   */
  readonly signal?: { readonly operations: readonly string[]; readonly key?: string };
  /**
   * REQUIRED: the catalogue lever this binding represents. A binder over an unmodified run-scoped
   * service is 'capability_bundle'; runner-specific argument rewriting is 'owner_refactor'.
   */
  readonly lever: Lever;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

/**
 * Generic main-side binder over an ALREADY run-scoped service (resolve request-scoped clients
 * on main before host.run; the request never crosses). Method receivers stay on main.
 */
export const bindService = <S extends object>(
  service: S,
  options: ServiceBinderOptions
): Binding => {
  if (!options.lever) throw new Error('bindService requires an explicit lever classification');
  const allowed = new Set(options.operations);
  const signalOps = new Set(options.signal?.operations ?? []);
  const signalKey = options.signal?.key ?? 'signal';
  return {
    lever: options.lever,
    ordered: options.ordered,
    handler: async (operation, args, _bundle, context) => {
      if (!allowed.has(operation)) throw new Error('Service operation not allowlisted');
      const method = (service as Record<string, unknown>)[operation];
      if (typeof method !== 'function') throw new Error('Service operation is not a method');
      let params: unknown[] = options.positional
        ? Array.isArray(args)
          ? [...args]
          : (() => {
              throw new Error('Positional service call requires an argument array');
            })()
        : args === undefined
        ? []
        : [args];
      if (signalOps.has(operation) && context?.signal) {
        const last = params[params.length - 1];
        params = isPlainObject(last)
          ? [...params.slice(0, -1), { ...last, [signalKey]: context.signal }]
          : [...params, { [signalKey]: context.signal }];
      }
      const result = await (method as (...values: unknown[]) => unknown).apply(service, params);
      return options.discardResult ? undefined : (result as CodecInput);
    },
  };
};

/** Worker-side caller for a bindService capability. */
export const createServiceCaller =
  (context: WorkerContext, capability: string, options: { readonly positional?: boolean } = {}) =>
  (operation: string, ...args: CodecInput[]): Promise<CodecInput> =>
    context.call(capability, operation, options.positional ? args : args[0]);
