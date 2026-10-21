/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encode, decode } from './codecs';
import { ExecutionHost } from './host';
import { ModuleRegistry } from './registry';

const fixture = () => {
  const regexp = /fixture/gi;
  regexp.lastIndex = 3;
  const dataView = new DataView(new ArrayBuffer(4));
  dataView.setInt32(0, -123);
  const pooled = Buffer.from('hidden-visible-hidden').subarray(7, 14);
  return {
    map: new Map([['one', new Set([2, 3])]]),
    set: new Set(['a', 'b']),
    regexp,
    url: new URL('https://example.invalid/a?q=1'),
    params: new URLSearchParams('x=1&x=2'),
    typed: new Uint16Array([1, 65535]),
    big: new BigInt64Array([9007199254740993n]),
    dataView,
    pooled,
    buffer: new Uint8Array([4, 5]).buffer,
    minusZero: -0,
    nan: NaN,
    infinite: Infinity,
  };
};
void test('collections preserve semantics, visible view bytes only, and reject weak/cyclic collections', () => {
  const value = fixture();
  const cloned = decode(encode(value));
  assert.deepEqual(cloned, value);
  assert.throws(() => encode(new WeakMap()), /Unsupported/);
  const cyclic = new Map<string, object>();
  cyclic.set('self', cyclic);
  assert.throws(() => encode(cyclic), /Cyclic/);
});
for (const transport of ['thread', 'process'] as const) {
  void test(
    transport + ': Map/Set and built-in values roundtrip through real protocol',
    { timeout: 30000 },
    async () => {
      const specifier = require.resolve('./example_tasks');
      const registry = new ModuleRegistry(new Set([specifier]));
      registry.register('echo', specifier, 'echo');
      const host = new ExecutionHost(registry, { transport });
      const value = fixture();
      try {
        const outcome = await host.run({
          workloadClass: 'workflow',
          moduleId: 'echo',
          input: value,
          principal: 'alice',
          space: 'space-a',
          capabilities: {},
          deadlineMs: 15000,
        });
        assert.equal(outcome.status, 'success');
        if (outcome.status === 'success') assert.deepEqual(outcome.value, value);
      } finally {
        await host.stop();
      }
    }
  );
}
