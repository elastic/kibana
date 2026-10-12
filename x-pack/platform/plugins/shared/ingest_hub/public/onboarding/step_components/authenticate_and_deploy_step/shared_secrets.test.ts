/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runWithSharedSecrets } from './shared_secrets';
import type { ExistingSecretRefs } from './secret_refs';

const refs = (id: string): ExistingSecretRefs =>
  new Map([['secret_access_key', { isSecretRef: true as const, id }]]);

describe('runWithSharedSecrets', () => {
  const getPolicyId = (item: string) => `policy-${item}`;

  it('runs every item at once with no sharing when nothing was typed', async () => {
    const run = jest.fn(async (item: string, _shared?: ExistingSecretRefs) => item);
    const fetchRefs = jest.fn();
    const { results, sharedRefs } = await runWithSharedSecrets({
      items: ['a', 'b'],
      hasTypedSecrets: false,
      run,
      getPolicyId,
      fetchRefs,
    });
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(run.mock.calls.map(([, shared]) => shared)).toEqual([undefined, undefined]);
    expect(fetchRefs).not.toHaveBeenCalled();
    expect(sharedRefs).toBeUndefined();
  });

  it('runs a single item with the typed credentials and returns the refs Fleet stored for it', async () => {
    const run = jest.fn(async (item: string, _shared?: ExistingSecretRefs) => item);
    const stored = refs('new-secret');
    const fetchRefs = jest.fn(async () => stored);
    const { sharedRefs } = await runWithSharedSecrets({
      items: ['a'],
      hasTypedSecrets: true,
      run,
      getPolicyId,
      fetchRefs,
    });
    expect(run).toHaveBeenCalledWith('a', undefined);
    // Later work in the same run (new policies) reuses these instead of the typed values.
    expect(sharedRefs).toBe(stored);
  });

  it('stores the typed credentials once and gives the rest the refs Fleet created', async () => {
    const order: string[] = [];
    const run = jest.fn(async (item: string, shared: ExistingSecretRefs | undefined) => {
      order.push(`run:${item}:${shared ? 'refs' : 'typed'}`);
      return item;
    });
    const fetchRefs = jest.fn(async (policyId: string) => {
      order.push(`fetch:${policyId}`);
      return refs('new-secret');
    });
    const { results, sharedRefs } = await runWithSharedSecrets({
      items: ['a', 'b', 'c'],
      hasTypedSecrets: true,
      run,
      getPolicyId,
      fetchRefs,
    });

    expect(order.slice(0, 2)).toEqual(['run:a:typed', 'fetch:policy-a']);
    expect(order.slice(2).sort()).toEqual(['run:b:refs', 'run:c:refs']);
    expect(run.mock.calls[1][1]).toBe(sharedRefs);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
  });

  it('uses the given refs for every item and never sends typed credentials', async () => {
    const initial = refs('already-created');
    const run = jest.fn(async (item: string, _shared?: ExistingSecretRefs) => item);
    const fetchRefs = jest.fn();
    const { sharedRefs } = await runWithSharedSecrets({
      items: ['a', 'b'],
      hasTypedSecrets: true,
      initialRefs: initial,
      run,
      getPolicyId,
      fetchRefs,
    });
    expect(run.mock.calls.map(([, shared]) => shared)).toEqual([initial, initial]);
    expect(fetchRefs).not.toHaveBeenCalled();
    expect(sharedRefs).toBe(initial);
  });

  it('keeps going with the typed credentials, sharing among the rest, when the first item fails', async () => {
    const run = jest.fn(async (item: string, shared: ExistingSecretRefs | undefined) => {
      if (item === 'a') throw new Error('boom');
      return `${item}:${shared ? 'refs' : 'typed'}`;
    });
    const fetchRefs = jest.fn(async () => refs('from-b'));
    const { results } = await runWithSharedSecrets({
      items: ['a', 'b', 'c'],
      hasTypedSecrets: true,
      run,
      getPolicyId,
      fetchRefs,
    });
    expect(results.map((r) => r.status)).toEqual(['rejected', 'fulfilled', 'fulfilled']);
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'b:typed' });
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'c:refs' });
    expect(fetchRefs).toHaveBeenCalledWith('policy-b');
  });

  it('falls back to the typed credentials when the refs cannot be read back', async () => {
    const run = jest.fn(async (item: string, shared: ExistingSecretRefs | undefined) =>
      shared ? 'refs' : `${item}:typed`
    );
    const fetchRefs = jest.fn(async () => new Map() as ExistingSecretRefs);
    const { results, sharedRefs } = await runWithSharedSecrets({
      items: ['a', 'b'],
      hasTypedSecrets: true,
      run,
      getPolicyId,
      fetchRefs,
    });
    expect(results.map((r) => (r as PromiseFulfilledResult<string>).value)).toEqual([
      'a:typed',
      'b:typed',
    ]);
    expect(sharedRefs).toBeUndefined();
  });

  describe('sequential', () => {
    const deferred = () => {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      return { promise, resolve };
    };

    it('starts the next item only after the previous one has finished', async () => {
      const gates = [deferred(), deferred(), deferred()];
      const started: string[] = [];
      const items = ['a', 'b', 'c'];
      const run = jest.fn(async (item: string) => {
        started.push(item);
        await gates[items.indexOf(item)].promise;
        return item;
      });
      const fetchRefs = jest.fn(async () => refs('new-secret'));

      const done = runWithSharedSecrets({
        items,
        hasTypedSecrets: true,
        sequential: true,
        run,
        getPolicyId,
        fetchRefs,
      });

      await new Promise((r) => setImmediate(r));
      expect(started).toEqual(['a']);
      gates[0].resolve();
      await new Promise((r) => setImmediate(r));
      expect(started).toEqual(['a', 'b']);
      gates[1].resolve();
      await new Promise((r) => setImmediate(r));
      expect(started).toEqual(['a', 'b', 'c']);
      gates[2].resolve();
      const { results } = await done;
      expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
    });

    it('keeps going after a failure and keeps the results in item order', async () => {
      const run = jest.fn(async (item: string) => {
        if (item === 'b') throw new Error('boom');
        return item;
      });
      const { results } = await runWithSharedSecrets({
        items: ['a', 'b', 'c'],
        hasTypedSecrets: false,
        sequential: true,
        run,
        getPolicyId,
        fetchRefs: jest.fn(),
      });
      expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    });

    it('runs everything at once when not sequential', async () => {
      const gates = [deferred(), deferred()];
      const started: string[] = [];
      const items = ['a', 'b'];
      const run = jest.fn(async (item: string) => {
        started.push(item);
        await gates[items.indexOf(item)].promise;
        return item;
      });
      const done = runWithSharedSecrets({
        items,
        hasTypedSecrets: false,
        run,
        getPolicyId,
        fetchRefs: jest.fn(),
      });
      await new Promise((r) => setImmediate(r));
      expect(started).toEqual(['a', 'b']);
      gates.forEach((g) => g.resolve());
      await done;
    });
  });
});
