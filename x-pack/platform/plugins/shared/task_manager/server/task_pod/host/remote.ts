/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PodContractCallResponse } from '../wire';
import { encodePodArgs } from '../wire';
import { deserializeTaskRunError } from '../../task_running/errors';
import { getRunContext } from './run_context';

/**
 * Calls a contract method a plugin registered with `taskManager.registerPodContract` in Kibana.
 * Must run inside a task run (the per-run callback token comes from the run context).
 */
export const callKibana = async <T = unknown>(
  pluginId: string,
  method: string,
  args: unknown[] = []
): Promise<T> => {
  const context = getRunContext();
  const callback = context?.callback;
  if (!context || !callback) {
    throw new Error(
      `${pluginId}.${method} is a remote pod contract and can only be called while serving a task run`
    );
  }
  const name = `${pluginId}.${method}`;
  context.calls[name] = (context.calls[name] ?? 0) + 1;

  const call = (async (): Promise<T> => {
    const response = await fetch(`${callback.url}/internal/task_manager/pod_contract`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'kbn-xsrf': 'task-pod',
        // Kibana rejects internal routes without it when internal APIs are restricted.
        'x-elastic-internal-origin': 'task-pod',
      },
      body: `{"token":${JSON.stringify(callback.token)},"pluginId":${JSON.stringify(
        pluginId
      )},"method":${JSON.stringify(method)},"args":${encodePodArgs(args)}}`,
      // Stop waiting when the run is aborted (deadline or cancel), so nothing outlives it.
      ...(context.signal ? { signal: context.signal } : {}),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        `${name}: ${
          response.status === 404
            ? body.message ?? 'not found in Kibana'
            : `Kibana responded ${response.status}`
        }`
      );
    }
    const body = (await response.json()) as PodContractCallResponse;
    if ('error' in body) throw deserializeTaskRunError(body.error);
    return body.result as T;
  })();

  // The host waits for the whole call, not just the request, before ending the run: work that
  // starts after a response (an event subscriber's follow-up call) must still find a live token.
  const tracked = call.then(
    () => undefined,
    () => undefined
  );
  context.pending.add(tracked);
  void tracked.then(() => context.pending.delete(tracked));
  return call;
};

/**
 * A contract object whose listed methods forward to Kibana. Anything not listed throws, so an
 * unported member fails loudly instead of silently returning undefined.
 */
export const remoteContract = <T extends object>(pluginId: string, methods: string[]): T =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop !== 'string' || prop === 'then') return undefined;
        if (!methods.includes(prop)) {
          return () => {
            throw new Error(`${pluginId}.${prop} is not available in a task pod`);
          };
        }
        return (...args: unknown[]) => callKibana(pluginId, prop, args);
      },
    }
  ) as T;

// Members JavaScript itself probes for (promise checks, serialization, printing).
const PASS_THROUGH = new Set(['then', 'toJSON', 'constructor', 'inspect', 'asymmetricMatch']);

/**
 * A plugin contract assembled for a pod from the members that work there (local functions or
 * `callKibana` adapters). Any other member throws when called, so a task that reaches for something
 * a pod doesn't provide fails loudly instead of getting `undefined`.
 */
export const podContract = <T extends object>(pluginId: string, provided: T): T =>
  new Proxy(provided, {
    get: (target, prop, receiver) => {
      if (prop in target || typeof prop !== 'string' || PASS_THROUGH.has(prop)) {
        return Reflect.get(target, prop, receiver);
      }
      return () => {
        throw new Error(`${pluginId}.${prop} is not available in a task pod`);
      };
    },
  });
