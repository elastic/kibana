/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bindAsyncServices } from './async_handles';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';
import type { CodecInput } from './codecs';
import type { Crossing } from './protocol';

class PrivateFixture {
  #value = 'host';
  public same(other: object): boolean {
    return this === other && this.#value === 'host';
  }
  public async withCallback(
    callback: (value: CodecInput) => Promise<CodecInput>
  ): Promise<CodecInput> {
    return callback(this.#value);
  }
  public returnArg(value: CodecInput): CodecInput {
    return value;
  }
}
for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': async handles preserve private receiver, owner roundtrip, callback and lifetime',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('handles', specifier, 'serviceHandles');
      const crossings: Crossing[] = [];
      const host = new ExecutionHost(registry, {
        transport,
        onCrossing: (entry) => crossings.push(entry),
      });
      try {
        const outcome = await host.run({
          workloadClass: 'agent',
          moduleId: 'handles',
          input: {},
          principal: 'alice',
          space: 'space-a',
          deadlineMs: 15000,
          capabilities: {
            handles: bindAsyncServices({ fixture: new PrivateFixture() }, { version: 1 }),
          },
        });
        assert.equal(outcome.status, 'success');
        if (outcome.status === 'success')
          assert.deepEqual(outcome.value, {
            identity: true,
            result: 'host-worker',
            callbackIdentity: true,
            callbackReleased: true,
            released: true,
            foreign: true,
            staticMetadata: 1,
          });
        assert.ok(crossings.some((entry) => entry.edge === 'handles.callback'));
        assert.ok(
          crossings.some(
            (entry) =>
              entry.handlerSyncCpuUs !== undefined && entry.handlerWindowCpuUs !== undefined
          )
        );
      } finally {
        await host.stop();
      }
    }
  );
}
