/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { errors } from '@elastic/elasticsearch';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import { encode, decode } from './codecs';
import type { CodecInput } from './codecs';
import type { Binding } from './host';

const specifier = require.resolve('./example_tasks');
const registry = (): ModuleRegistry => {
  const value = new ModuleRegistry(new Set([specifier]));
  for (const name of [
    'abortProbe',
    'delayed',
    'busyThenReturn',
    'spin',
    'unencodableCallback',
    'unorderedBurst',
    'esErrorRoundtrip',
    'echo',
  ])
    value.register(name, specifier, name);
  return value;
};
const base = {
  workloadClass: 'fixture',
  principal: 'alice',
  space: 'space-a',
  capabilities: {},
  input: null,
};
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

test('codec: ES client errors keep class, status, retry semantics and drop credentials', () => {
  const original = new errors.ResponseError({
    body: { error: { type: 'circuit_breaking_exception' }, status: 429 },
    statusCode: 429,
    headers: { 'retry-after': '1', 'set-cookie': ['sid=secret-key'] },
    warnings: null,
    meta: {
      context: null,
      name: 'elasticsearch-js',
      request: {
        params: { method: 'POST', path: '/x/_search', headers: { authorization: 'secret-key' } },
        options: {},
        id: 7,
      },
      connection: null,
      attempts: 2,
      aborted: false,
    },
  });
  const restored = decode(encode(original)) as InstanceType<typeof errors.ResponseError>;
  assert.ok(restored instanceof errors.ResponseError);
  assert.equal(restored.statusCode, 429);
  assert.equal(isRetryableEsClientError(restored), true);
  assert.equal(restored.message, original.message);
  assert.equal(restored.headers?.['retry-after'], '1');
  assert.equal(JSON.stringify(encode(original)).includes('secret-key'), false);
  assert.equal(restored.meta.meta.attempts, 2);
  const notRetryable = decode(
    encode(
      new errors.ResponseError({
        body: { status: 400 },
        statusCode: 400,
        warnings: null,
        meta: original.meta.meta,
      })
    )
  ) as InstanceType<typeof errors.ResponseError>;
  assert.equal(isRetryableEsClientError(notRetryable), false);
  for (const error of [
    new errors.TimeoutError('t'),
    new errors.ConnectionError('c'),
    new errors.RequestAbortedError('a'),
  ]) {
    const back = decode(encode(error)) as Error;
    assert.equal(back.constructor, error.constructor);
    assert.equal(back.message, error.message);
  }
  assert.equal(
    isRetryableEsClientError(decode(encode(new errors.TimeoutError('t'))) as errors.TimeoutError),
    true
  );
});

test('long deadlines are re-armed instead of overflowing to 1ms', { timeout: 20000 }, async () => {
  const host = new ExecutionHost(registry(), { transport: 'thread' });
  try {
    const outcome = await host.run({
      ...base,
      moduleId: 'delayed',
      input: { ms: 300 },
      deadlineMs: YEAR_MS,
    });
    assert.equal(outcome.status, 'success');
    await assert.rejects(
      host.run({ ...base, moduleId: 'echo', deadlineMs: Number.MAX_SAFE_INTEGER + 2 }),
      /Invalid deadline/
    );
    await assert.rejects(
      host.run({ ...base, moduleId: 'echo', deadlineMs: 1000, stallMs: 10 }),
      /stallMs/
    );
  } finally {
    await host.stop();
  }
});

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': original abort reason and cancellation category reach the worker',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport, abortGraceMs: 3000 });
      const run = async (abort: (controller: AbortController) => void, deadlineMs = YEAR_MS) => {
        const controller = new AbortController();
        const pending = host.run({
          ...base,
          moduleId: 'abortProbe',
          deadlineMs,
          signal: controller.signal,
        });
        await new Promise((resolve) => setTimeout(resolve, 400));
        abort(controller);
        return pending;
      };
      try {
        const custom = await run((c) => c.abort({ source: 'api', actor: 'user-1' }));
        assert.equal(custom.status, 'terminated');
        if (custom.status !== 'terminated') return;
        assert.equal(custom.reason, 'cancelled');
        assert.equal(custom.graceful, true);
        assert.deepEqual(custom.terminal, {
          cancellation: { reason: 'cancelled', hasOriginalReason: true },
          isDomException: false,
          name: null,
          value: { source: 'api', actor: 'user-1' },
        });
        const typed = await run((c) => c.abort(new Error('typed reason')));
        if (typed.status === 'terminated')
          assert.equal((typed.terminal as { name: string }).name, 'Error');
        const plain = await run((c) => c.abort());
        if (plain.status === 'terminated')
          assert.deepEqual(plain.terminal, {
            cancellation: { reason: 'cancelled', hasOriginalReason: false },
            isDomException: true,
            name: 'AbortError',
            value: null,
          });
        // An unencodable reason degrades to the categorical AbortError, never a slot failure.
        const odd = await run((c) => c.abort(() => 'fn'));
        if (odd.status === 'terminated')
          assert.equal((odd.terminal as { name: string }).name, 'AbortError');
        const deadline = await host.run({ ...base, moduleId: 'abortProbe', deadlineMs: 300 });
        assert.equal(deadline.status, 'terminated');
        if (deadline.status === 'terminated') {
          assert.equal(deadline.reason, 'deadline');
          assert.deepEqual(deadline.terminal, {
            cancellation: { reason: 'deadline', hasOriginalReason: false },
            isDomException: true,
            name: 'TimeoutError',
            value: null,
          });
        }
        const shutdownRun = host.run({ ...base, moduleId: 'abortProbe', deadlineMs: YEAR_MS });
        await new Promise((resolve) => setTimeout(resolve, 400));
        await host.stop();
        const shutdown = await shutdownRun;
        assert.equal(shutdown.status, 'terminated');
        if (shutdown.status === 'terminated')
          assert.deepEqual(shutdown.terminal, {
            cancellation: { reason: 'shutdown', hasOriginalReason: false },
            isDomException: true,
            name: 'AbortError',
            value: null,
          });
      } finally {
        await host.stop();
      }
    }
  );

  test(
    transport + ': stall watchdog aborts a blocked isolate then hard-stops; others recover',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport, abortGraceMs: 200 });
      try {
        const started = Date.now();
        const stalled = await host.run({
          ...base,
          moduleId: 'spin',
          deadlineMs: YEAR_MS,
          stallMs: 500,
        });
        const elapsed = Date.now() - started;
        assert.equal(stalled.status, 'terminated');
        if (stalled.status === 'terminated') {
          assert.equal(stalled.reason, 'stall');
          assert.equal(stalled.graceful, undefined);
        }
        assert.ok(elapsed < 5000, 'stall detected in ' + elapsed + 'ms');
        // A short legitimate synchronous block below stallMs is not a stall.
        const brief = await host.run({
          ...base,
          moduleId: 'busyThenReturn',
          input: { ms: 100 },
          deadlineMs: YEAR_MS,
          stallMs: 1000,
        });
        assert.equal(brief.status, 'success');
        // Long idle async waits keep heartbeating, so they are not stalls either.
        const idle = await host.run({
          ...base,
          moduleId: 'delayed',
          input: { ms: 1200 },
          deadlineMs: YEAR_MS,
          stallMs: 300,
        });
        assert.equal(idle.status, 'success');
      } finally {
        await host.stop();
      }
    }
  );

  test(
    transport + ': unencodable callback result fails that call, not the slot',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport });
      const fixture: Binding = {
        lever: 'capability_bundle',
        handler: async (operation, args, _bundle, context) => {
          if (operation === 'throw429') throw new Error('unused');
          const { reference } = args as {
            reference: Parameters<NonNullable<typeof context>['invokeCallback']>[0];
          };
          try {
            await context?.invokeCallback(reference, []);
            return 'unexpected-success';
          } catch (error) {
            return (error as Error).message;
          }
        },
      };
      try {
        const outcome = await host.run({
          ...base,
          moduleId: 'unencodableCallback',
          deadlineMs: 10000,
          capabilities: { fixture },
        });
        assert.equal(outcome.status, 'success');
        if (outcome.status === 'success')
          assert.deepEqual(outcome.value, {
            outcome: 'Callback result is not transportable',
            stillAlive: true,
          });
      } finally {
        await host.stop();
      }
    }
  );

  test(
    transport + ': ordered bindings serialize concurrent calls; default bindings may not',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport });
      const make = (ordered: boolean): Binding & { log: number[] } => {
        const log: number[] = [];
        return {
          log,
          lever: 'capability_bundle',
          ordered,
          handler: async (operation, args) => {
            if (operation === 'read') return log as CodecInput;
            const { index } = args as { index: number };
            // Earlier calls are slower: concurrent handling would complete out of order.
            await new Promise((resolve) => setTimeout(resolve, (20 - index) * 3));
            log.push(index);
            return null;
          },
        };
      };
      const ordered = make(true);
      const unordered = make(false);
      try {
        const first = await host.run({
          ...base,
          moduleId: 'unorderedBurst',
          input: { capability: 'ordered', count: 20 },
          deadlineMs: 10000,
          capabilities: { ordered },
        });
        assert.equal(first.status, 'success');
        assert.deepEqual(ordered.log, [...Array(20).keys()]);
        const second = await host.run({
          ...base,
          moduleId: 'unorderedBurst',
          input: { capability: 'unordered', count: 20 },
          deadlineMs: 10000,
          capabilities: { unordered },
        });
        assert.equal(second.status, 'success');
        assert.notDeepEqual(unordered.log, [...Array(20).keys()]);
      } finally {
        await host.stop();
      }
    }
  );

  test(
    transport + ': ES ResponseError crosses both ways with instanceof and retry guards',
    { timeout: 30000 },
    async () => {
      const host = new ExecutionHost(registry(), { transport });
      const fixture: Binding = {
        lever: 'capability_bundle',
        handler: async () => {
          throw new errors.ResponseError({
            body: { error: { type: 'es_rejected_execution_exception' }, status: 429 },
            statusCode: 429,
            headers: { 'retry-after': '2' },
            warnings: null,
            meta: {
              context: null,
              name: 'elasticsearch-js',
              request: {
                params: {
                  method: 'POST',
                  path: '/_bulk',
                  headers: { authorization: 'secret-key' },
                },
                options: {},
                id: 1,
              },
              connection: null,
              attempts: 0,
              aborted: false,
            },
          });
        },
      };
      try {
        const outcome = await host.run({
          ...base,
          moduleId: 'esErrorRoundtrip',
          deadlineMs: 20000,
          capabilities: { fixture },
        });
        assert.equal(outcome.status, 'failure');
        if (outcome.status !== 'failure') return;
        assert.ok(outcome.error instanceof errors.ConnectionError);
        assert.equal(isRetryableEsClientError(outcome.error as errors.ConnectionError), true);
        const summary = JSON.parse((outcome.error.cause as Error).message);
        assert.deepEqual(summary, {
          instanceOf: true,
          retryable: true,
          statusCode: 429,
          bodyType: 'es_rejected_execution_exception',
          retryAfter: '2',
          leakedAuthorization: false,
        });
      } finally {
        await host.stop();
      }
    }
  );
}

test(
  'stall watchdog does not blame a healthy worker for a MAIN-thread block',
  { timeout: 30000 },
  async () => {
    const host = new ExecutionHost(registry(), { transport: 'thread', abortGraceMs: 100 });
    try {
      const pending = host.run({
        ...base,
        moduleId: 'delayed',
        input: { ms: 2500 },
        deadlineMs: YEAR_MS,
        stallMs: 300,
      });
      await new Promise((resolve) => setTimeout(resolve, 700));
      // Main is blocked for 1s: worker heartbeats queue up but cannot be received yet.
      const end = performance.now() + 1000;
      while (performance.now() < end) {
        // Synchronous main-thread block.
      }
      const settled = await pending;
      assert.deepEqual(settled.status === 'success' ? 'success' : settled, 'success');
    } finally {
      await host.stop();
    }
  }
);
