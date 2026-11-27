/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createWithActiveSpan } from '@kbn/tracing-utils';
import { trace } from '@opentelemetry/api';

const withEntityStoreSpan = createWithActiveSpan({
  tracer: trace.getTracer('entity_store'),
  attributes: { 'plugin.id': 'entityStore' },
});

type SpanAttributeValue = string | number | boolean;

interface RunWithSpanParams<T> {
  name: string;
  namespace: string;
  attributes?: Record<string, SpanAttributeValue>;
  cb: () => T;
}

interface WrapTaskRunParams<T> {
  spanName: string;
  namespace: string;
  attributes?: Record<string, SpanAttributeValue>;
  run: () => Promise<T>;
}

export const runWithSpan = <T>({ name, namespace, attributes = {}, cb }: RunWithSpanParams<T>): T =>
  withEntityStoreSpan(
    name,
    {
      attributes: {
        'entity_store.namespace': namespace,
        ...attributes,
      },
    },
    cb
  );

/**
 * A run that returns `error` still resolves, so its span would end OK. Throw the error inside the
 * span so it records the failure, then hand the result back to Task Manager unchanged.
 */
export const wrapTaskRun = async <T>({
  spanName,
  namespace,
  attributes = {},
  run,
}: WrapTaskRunParams<T>): Promise<T> => {
  const failed: { error?: unknown; result?: T } = {};
  try {
    return await runWithSpan({
      name: spanName,
      namespace,
      attributes,
      cb: async () => {
        const result = await run();
        const error = (result as { error?: unknown } | undefined)?.error;
        if (error) {
          failed.error = error;
          failed.result = result;
          throw error;
        }
        return result;
      },
    });
  } catch (e) {
    if (e === failed.error && failed.result !== undefined) return failed.result;
    throw e;
  }
};
