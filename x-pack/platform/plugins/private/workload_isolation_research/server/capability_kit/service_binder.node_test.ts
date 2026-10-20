/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import { bindService } from './bind_service';
import type { Crossing } from './protocol';

class RunScopedService {
  readonly #secret = 40;
  public aborted: string | undefined;
  add(left: number, right: number): number {
    return left + right + this.#secret - 40;
  }
  greet(options: { name: string }): string {
    return 'hello ' + options.name;
  }
  secretMethod(): number {
    return this.#secret;
  }
  waitForAbort(options: { signal?: AbortSignal }): Promise<string> {
    return new Promise((resolve) => {
      options.signal?.addEventListener('abort', () => {
        this.aborted = (options.signal?.reason as Error).name;
        resolve('aborted');
      });
    });
  }
}

for (const transport of ['thread', 'process'] as const) {
  test(
    transport + ': generic bindService keeps receivers, allowlists, orders and stops main work',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('serviceBinder', specifier, 'serviceBinder');
      const crossings: Crossing[] = [];
      const host = new ExecutionHost(registry, {
        transport,
        abortGraceMs: 100,
        onCrossing: (entry) => crossings.push(entry),
      });
      const service = new RunScopedService();
      const lines: string[] = [];
      const logger = {
        info: async (message: string) => {
          // Earlier lines are slower: only an ordered binding keeps first, second, third.
          await new Promise((resolve) =>
            setTimeout(resolve, message === 'first' ? 60 : message === 'second' ? 30 : 0)
          );
          lines.push(message);
        },
      };
      const capabilities = {
        svc: bindService(service, {
          operations: ['add', 'greet', 'waitForAbort'],
          positional: true,
          signal: { operations: ['waitForAbort'] },
        }),
        log: bindService(logger, {
          operations: ['info'],
          positional: true,
          ordered: true,
          discardResult: true,
        }),
      };
      const base = {
        workloadClass: 'fixture',
        moduleId: 'serviceBinder',
        principal: 'alice',
        space: 'space-a',
        capabilities,
      };
      try {
        const outcome = await host.run({ ...base, input: {}, deadlineMs: 10000 });
        assert.equal(outcome.status, 'success');
        if (outcome.status === 'success')
          assert.deepEqual(outcome.value, {
            sum: 5,
            greeting: 'hello w',
            denied: 'Service operation not allowlisted',
          });
        assert.deepEqual(lines, ['first', 'second', 'third']);
        assert.ok(
          crossings.some(
            (entry) =>
              entry.edge === 'svc.add' && entry.generic && entry.lever.startsWith('Per-run')
          )
        );
        const hung = await host.run({ ...base, input: { hang: true }, deadlineMs: 500 });
        assert.equal(hung.status, 'terminated');
        // Main-side work received the run's signal and stopped once the run was gone.
        await new Promise((resolve) => setTimeout(resolve, 50));
        assert.equal(service.aborted, 'TimeoutError');
      } finally {
        await host.stop();
      }
    }
  );
}
