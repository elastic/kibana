/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import type { SpanContext } from '@opentelemetry/api';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';
import { ModuleRegistry } from './registry';
import { ExecutionHost } from './host';

const TRACE_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRACE_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SPAN = '0123456789abcdef';

const manager = new AsyncHooksContextManager();
manager.enable();
context.setGlobalContextManager(manager);

const span = (traceId: string): SpanContext => ({
  traceId,
  spanId: SPAN,
  traceFlags: 1,
});

const under = <T>(traceId: string, fn: () => Promise<T>): Promise<T> =>
  context.with(trace.setSpanContext(ROOT_CONTEXT, span(traceId)), fn);

for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': a worker task keeps the main trace id across continuations and co-resident runs',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./parent_span_task');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('readParentSpan', specifier, 'readParentSpan');
      const host = new ExecutionHost(registry, {
        transport,
        slotsPerClass: 1,
        concurrencyPerClass: { trace: 2 },
      });
      const base = {
        workloadClass: 'trace',
        moduleId: 'readParentSpan',
        input: null,
        principal: 'alice',
        space: 'space-a',
        capabilities: {},
        deadlineMs: 10000,
      };
      try {
        const [left, right] = await Promise.all([
          under(TRACE_A, () => host.run(base)),
          under(TRACE_B, () => host.run(base)),
        ]);
        assert.equal(left.status, 'success');
        assert.equal(right.status, 'success');
        if (left.status !== 'success' || right.status !== 'success') return;
        assert.deepEqual(left.value, { before: TRACE_A, after: TRACE_A });
        assert.deepEqual(right.value, { before: TRACE_B, after: TRACE_B });
        const bare = await host.run(base);
        assert.equal(bare.status, 'success');
        if (bare.status !== 'success') return;
        assert.deepEqual(bare.value, { before: null, after: null });
      } finally {
        await host.stop();
      }
    }
  );
}
