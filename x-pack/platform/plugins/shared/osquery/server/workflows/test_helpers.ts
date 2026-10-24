/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import type { KibanaApiCaller } from './lib/types';

export const apiError = (status: number, message = 'failed') =>
  new KibanaApiCallError({ status, headers: {}, body: { message }, message });

type Handler = (params: { query?: Record<string, unknown>; body?: unknown }) => unknown;

/**
 * A `contextManager` whose `callKibanaApi` answers by `"METHOD path"`. A handler returning an
 * `Error` makes the call throw it; anything else is the response body.
 */
export const createContextManager = (routes: Record<string, Handler>) => {
  const callKibanaApi = jest.fn(async (params: Parameters<KibanaApiCaller['callKibanaApi']>[0]) => {
    const handler = routes[`${params.method} ${params.path}`];
    if (!handler) throw new Error(`Unexpected call: ${params.method} ${params.path}`);
    const result = await handler(params);
    if (result instanceof Error) throw result;

    return { status: 200, body: result };
  }) as unknown as jest.MockedFunction<KibanaApiCaller['callKibanaApi']>;

  return { callKibanaApi };
};

export const createLogger = () => ({ warn: jest.fn() });

/** Result documents as the results route returns them (one edge per document). */
export const resultEdges = (count: number, agentId = 'agent-1') =>
  Array.from({ length: count }, (_, index) => ({
    _source: {
      '@timestamp': '2026-10-19T10:00:00.000Z',
      agent: { id: agentId, name: `host-${agentId}` },
      osquery: { pid: String(index), name: 'bash' },
      'process.name': 'bash',
      unrelated: 'dropped',
    },
  }));
