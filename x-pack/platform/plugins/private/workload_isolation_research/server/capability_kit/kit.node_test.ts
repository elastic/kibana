/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import moment from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import { encode, decode } from './codecs';
import { ModuleRegistry } from './registry';
import { ExecutionHost } from './host';
import type { Crossing } from './protocol';

test('configuration codecs preserve serverless value methods and fail closed', () => {
  const restored = decode(
    encode({
      limit: new ByteSizeValue(2048),
      timeout: moment.duration(3, 's'),
      error: new Error('fixture'),
      large: 9007199254740993n,
    })
  );
  const value = restored as {
    limit: ByteSizeValue;
    timeout: moment.Duration;
    error: Error;
    large: bigint;
  };
  assert.equal(value.limit.getValueInBytes(), 2048);
  assert.equal(value.timeout.asMilliseconds(), 3000);
  assert.equal(value.error.message, 'fixture');
  assert.equal(value.large, 9007199254740993n);
  assert.throws(() => encode(() => 1), /module descriptor/);
  const cyclic: { self?: object } = {};
  cyclic.self = cyclic;
  assert.throws(() => encode(cyclic), /Cyclic/);
  assert.throws(
    () => decode({ kind: 'object', entries: [['__proto__', { kind: 'primitive', value: 'bad' }]] }),
    /Unsafe/
  );
});

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': real slot, revision, bridge, hard-stop and recovery',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      for (const name of ['echo', 'bridge', 'spin', 'wrongGrant'])
        registry.register(name, specifier, name);
      assert.throws(() => registry.register('bad', '/not/allowlisted', 'x'), /allowlisted/);
      const crossings: Crossing[] = [];
      const host = new ExecutionHost(registry, {
        transport,
        onCrossing: (entry) => crossings.push(entry),
      });
      const base = {
        workloadClass: 'fixture',
        principal: 'alice',
        space: 'space-a',
        deadlineMs: 10000,
        capabilities: {
          fixture: {
            lever: 'capability_bundle' as const,
            handler: async (
              _operation: string,
              args: object | string | number | boolean | bigint | null | undefined
            ) => args,
          },
        },
      };
      try {
        const first = await host.run({
          ...base,
          moduleId: 'echo',
          input: { value: 1, limit: new ByteSizeValue(4096) },
        });
        assert.equal(first.status, 'success');
        if (first.status === 'success')
          assert.equal((first.value as { limit: ByteSizeValue }).limit.getValueInBytes(), 4096);
        const bridged = await host.run({ ...base, moduleId: 'bridge', input: 'bridged' });
        assert.equal(bridged.status, 'success');
        if (bridged.status === 'success') assert.equal(bridged.value, 'bridged');
        registry.register('echo', specifier, 'alternate');
        const updated = await host.run({ ...base, moduleId: 'echo', input: {} });
        assert.equal(updated.status, 'success');
        if (updated.status === 'success') assert.equal(updated.value, 'new-revision');
        registry.remove('echo');
        const removed = await host.run({ ...base, moduleId: 'echo', input: {} });
        assert.equal(removed.status, 'failure');
        const denied = await host.run({ ...base, moduleId: 'wrongGrant', input: {} });
        assert.equal(denied.status, 'failure');
        const stopped = await host.run({ ...base, moduleId: 'spin', input: {}, deadlineMs: 300 });
        assert.deepEqual(stopped, { status: 'terminated', reason: 'deadline' });
        const recovered = await host.run({ ...base, moduleId: 'bridge', input: 'recovered' });
        assert.equal(recovered.status, 'success');
        assert.ok(crossings.every((entry) => entry.generic && entry.bytes > 0));
        assert.ok(crossings.some((entry) => entry.edge === 'fixture.echo'));
        assert.ok(crossings.every((entry) => !JSON.stringify(entry).includes('recovered')));
      } finally {
        await host.stop();
      }
    }
  );
  test(
    transport + ': cancellation fences late host replies without killing another class',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('bridge', specifier, 'bridge');
      registry.register('echo', specifier, 'echo');
      const host = new ExecutionHost(registry, { transport });
      let notifyStarted: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });
      let resolveSlow: (value: string) => void = () => {};
      const slow = new Promise<string>((resolve) => {
        resolveSlow = resolve;
      });
      const controller = new AbortController();
      const base = {
        workloadClass: 'blocked',
        principal: 'alice',
        space: 'space-a',
        deadlineMs: 15000,
        input: {},
      };
      try {
        const old = host.run({
          ...base,
          moduleId: 'bridge',
          signal: controller.signal,
          capabilities: {
            fixture: {
              lever: 'capability_bundle',
              handler: async () => {
                notifyStarted();
                return slow;
              },
            },
          },
        });
        await started;
        const neighbour = host.run({
          ...base,
          workloadClass: 'neighbour',
          moduleId: 'echo',
          capabilities: {},
          input: 'neighbour',
        });
        controller.abort();
        assert.deepEqual(await old, { status: 'terminated', reason: 'cancelled' });
        const fresh = host.run({
          ...base,
          moduleId: 'echo',
          capabilities: {},
          input: 'new-generation',
        });
        resolveSlow('stale-result');
        for (const [pending, expected] of [
          [neighbour, 'neighbour'],
          [fresh, 'new-generation'],
        ] as const) {
          const outcome = await pending;
          assert.equal(outcome.status, 'success');
          if (outcome.status === 'success') assert.equal(outcome.value, expected);
        }
      } finally {
        resolveSlow('cleanup');
        await host.stop();
      }
    }
  );
}
