/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ModuleRegistry } from './registry';
import { ExecutionHost } from './host';
import type { RunOptions } from './host';

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': two async runs share a slot but not identity or signal',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('hold', specifier, 'hold');
      registry.register('cooperative', specifier, 'cooperative');
      const host = new ExecutionHost(registry, {
        transport,
        concurrencyPerClass: { io: 2 },
        abortGraceMs: 2000,
      });
      const controller = new AbortController();
      let startedCount = 0;
      let resolveBoth: () => void = () => {};
      const bothStarted = new Promise<void>((resolve) => {
        resolveBoth = resolve;
      });
      let release: (value: string) => void = () => {};
      const held = new Promise<string>((resolve) => {
        release = resolve;
      });
      const options: RunOptions = {
        workloadClass: 'io',
        moduleId: 'hold',
        input: {},
        principal: 'bob',
        space: 'space-b',
        deadlineMs: 15000,
        capabilities: {
          fixture: {
            lever: 'capability_bundle',
            handler: async (operation, args, bundle) => {
              if (operation === 'hold' || operation === 'started') {
                if (++startedCount === 2) resolveBoth();
                if (operation === 'hold') {
                  assert.equal(bundle.principal, 'bob');
                  assert.equal(bundle.space, 'space-b');
                  return held;
                }
              }
              return args;
            },
          },
        },
      };
      try {
        const neighbour = host.run(options);
        const cancelled = host.run({
          ...options,
          moduleId: 'cooperative',
          principal: 'alice',
          space: 'space-a',
          signal: controller.signal,
        });
        await bothStarted;
        controller.abort();
        const stopped = await cancelled;
        assert.equal(stopped.status, 'terminated');
        if (stopped.status === 'terminated') assert.equal(stopped.graceful, true);
        release('held-output');
        const completed = await neighbour;
        assert.equal(completed.status, 'success');
        if (completed.status === 'success')
          assert.deepEqual(
            { ...(completed.value as object), threadId: 0 },
            { result: 'held-output', threadId: 0, principal: 'bob', space: 'space-b' }
          );
      } finally {
        release('cleanup');
        await host.stop();
      }
    }
  );

  test(
    transport + ': hard kill reports ALL co-resident collateral and recovers',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      for (const name of ['hold', 'spin', 'echo']) registry.register(name, specifier, name);
      const host = new ExecutionHost(registry, {
        transport,
        concurrencyPerClass: { io: 2 },
        abortGraceMs: 50,
      });
      let notify: () => void = () => {};
      const started = new Promise<void>((resolve) => {
        notify = resolve;
      });
      let release: (value: string) => void = () => {};
      const held = new Promise<string>((resolve) => {
        release = resolve;
      });
      const base: RunOptions = {
        workloadClass: 'io',
        moduleId: 'hold',
        input: {},
        principal: 'alice',
        space: 'space-a',
        deadlineMs: 15000,
        capabilities: {
          fixture: {
            lever: 'capability_bundle',
            handler: async () => {
              notify();
              return held;
            },
          },
        },
      };
      try {
        const neighbour = host.run(base);
        await started;
        const offender = host.run({ ...base, moduleId: 'spin', deadlineMs: 300 });
        const [lost, culprit] = await Promise.all([neighbour, offender]);
        assert.equal(lost.status, 'terminated');
        assert.equal(culprit.status, 'terminated');
        if (lost.status === 'terminated' && culprit.status === 'terminated') {
          assert.equal(lost.collateral, true);
          assert.equal(culprit.collateral, false);
          assert.equal(lost.initiatingRunId, culprit.initiatingRunId);
          assert.equal(lost.discardedRunIds?.length, 2);
          assert.deepEqual(lost.discardedRunIds, culprit.discardedRunIds);
        }
        release('stale');
        const recovered = await host.run({ ...base, moduleId: 'echo', input: 'recovery' });
        assert.equal(recovered.status, 'success');
        if (recovered.status === 'success') assert.equal(recovered.value, 'recovery');
      } finally {
        release('cleanup');
        await host.stop();
      }
    }
  );
}
