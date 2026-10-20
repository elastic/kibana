/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { isMainThread } from 'node:worker_threads';
import { test } from 'node:test';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import { bindSyncOperations } from './sync_operations';
import type { Crossing } from './protocol';

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': bounded worker sync support is explicit; main never waits',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('sync', specifier, 'syncLookup');
      registry.register('bridge', specifier, 'bridge');
      const records: Crossing[] = [];
      const host = new ExecutionHost(registry, {
        transport,
        onCrossing: (entry) => records.push(entry),
      });
      const fixture = bindSyncOperations({
        echo: (args) => {
          assert.ok(isMainThread);
          return args;
        },
        large: () => 'x'.repeat(10000),
      });
      const base = {
        workloadClass: 'fixture',
        moduleId: 'sync',
        input: 'echo',
        principal: 'alice',
        space: 'space-a',
        deadlineMs: 10000,
        capabilities: { fixture },
      };
      try {
        const outcome = await host.run(base);
        if (transport === 'thread') {
          assert.equal(outcome.status, 'success');
          if (outcome.status === 'success')
            assert.deepEqual(outcome.value, { value: 'sync-fixture' });
          assert.ok(records.some((entry) => entry.lever.startsWith('Worker→main sync proxy')));
          assert.equal((await host.run({ ...base, input: 'missing' })).status, 'failure');
          const overflow = await host.run({ ...base, input: 'large' });
          assert.equal(overflow.status, 'failure');
          if (overflow.status === 'failure') assert.match(overflow.error.message, /bounds/);
        } else {
          assert.equal(outcome.status, 'failure');
          if (outcome.status === 'failure') assert.match(outcome.error.message, /thread-only/);
        }
        assert.equal(
          (await host.run({ ...base, moduleId: 'bridge', input: 'async-fallback' })).status,
          'success'
        );
      } finally {
        await host.stop();
      }
    }
  );
}
