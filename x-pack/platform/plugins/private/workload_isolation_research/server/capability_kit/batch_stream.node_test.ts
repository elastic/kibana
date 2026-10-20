/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindBatchStream, createBatchStream } from './batch_stream';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import type { Bundle, WorkerContext } from './protocol';
import type { CodecInput } from './codecs';

const bundle: Bundle = { runId: 'fixture', principal: 'alice', space: 'space-a', grants: {} };
test('batch binding fails closed on sequence, post-terminal and oversize', async () => {
  const binding = bindBatchStream(async () => {}, { maxEvents: 1, maxBytes: 200 });
  await assert.rejects(
    binding.handler('batch', { streamId: 'one', sequence: 1, terminal: false, events: [] }, bundle),
    /sequence/
  );
  await binding.handler(
    'batch',
    { streamId: 'one', sequence: 0, terminal: true, events: [] },
    bundle
  );
  await assert.rejects(
    binding.handler('batch', { streamId: 'one', sequence: 1, terminal: false, events: [] }, bundle),
    /sequence/
  );
  await assert.rejects(
    binding.handler(
      'batch',
      { streamId: 'two', sequence: 0, terminal: false, events: ['x'.repeat(300)] },
      bundle
    ),
    /bounds/
  );
  binding.onRunEnd?.(bundle);
});

test('writer rejects unbounded fire-and-forget queue and wrong ACK', async () => {
  let release: (value: CodecInput) => void = () => {};
  const wait = new Promise<CodecInput>((resolve) => {
    release = resolve;
  });
  const context: WorkerContext = {
    bundle,
    signal: new AbortController().signal,
    load: async () => ({}),
    call: async () => wait,
  };
  const stream = createBatchStream(context, 'events', { maxPendingBatches: 1 });
  const first = stream.write([1]);
  await assert.rejects(stream.write([2]), /backpressure/);
  release({ ack: 99 });
  await assert.rejects(first, /ACK mismatch/);
  await assert.rejects(stream.close(), /ACK mismatch/);
});

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': consumer-settled ACK orders batches before task outcome',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('streaming', specifier, 'streaming');
      const host = new ExecutionHost(registry, { transport });
      const sequences: number[] = [];
      const ordinals: number[] = [];
      let terminal = false;
      let inflight = 0;
      const events = bindBatchStream(
        async (batch) => {
          assert.equal(++inflight, 1);
          await new Promise((resolve) => setTimeout(resolve, 2));
          sequences.push(batch.sequence);
          for (const item of batch.events) ordinals.push((item as { ordinal: number }).ordinal);
          terminal = batch.terminal;
          inflight--;
        },
        { maxEvents: 2 }
      );
      try {
        const outcome = await host.run({
          workloadClass: 'agent',
          moduleId: 'streaming',
          input: {},
          principal: 'alice',
          space: 'space-a',
          deadlineMs: 10000,
          capabilities: { events },
        });
        assert.equal(outcome.status, 'success');
        assert.deepEqual(sequences, [0, 1, 2]);
        assert.deepEqual(ordinals, [1, 2, 3]);
        assert.ok(terminal);
        assert.equal(inflight, 0);
      } finally {
        await host.stop();
      }
    }
  );
}
