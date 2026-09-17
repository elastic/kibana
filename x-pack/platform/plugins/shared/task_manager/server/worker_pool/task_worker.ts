/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskWorkerPayload } from './types';

/**
 * A worker module's shape: a default-exported function taking the structured-cloneable
 * `input` and returning a structured-cloneable result. Runs with no Kibana services -
 * no ES/SO clients, no logger, no plugin contracts are available in this thread.
 */
interface WorkerModule<TInput = unknown, TResult = unknown> {
  default: (input: TInput) => TResult | Promise<TResult>;
}

/**
 * Generic Piscina task dispatcher. Every worker task type and every `runInWorker(...)` call
 * resolves to this single entry point, which loads the caller-supplied module (by the
 * `require.resolve`d id it registered with) and invokes its default export. Keeping the
 * dispatcher generic means the pool doesn't need a dedicated worker file per task type.
 */
// eslint-disable-next-line import/no-default-export
export default function runTaskWorker({ moduleId, input }: TaskWorkerPayload): unknown {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: WorkerModule = require(moduleId);
  if (typeof mod?.default !== 'function') {
    throw new Error(
      `Worker module "${moduleId}" must have a default export function, e.g. "export default (input) => ...".`
    );
  }
  return mod.default(input);
}
