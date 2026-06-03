/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LeasePool } from './lease_pool';

describe('LeasePool', () => {
  describe('reuse: N sequential leases on the same key', () => {
    it('calls buildFn exactly once and returns the same client each time', async () => {
      const pool = new LeasePool<string>();
      let callCount = 0;
      const buildFn = async () => {
        callCount++;
        return 'client-a';
      };

      const r1 = await pool.lease('key', buildFn);
      const r2 = await pool.lease('key', buildFn);
      const r3 = await pool.lease('key', buildFn);

      expect(callCount).toBe(1);
      expect(r1).toBe('client-a');
      expect(r2).toBe('client-a');
      expect(r3).toBe('client-a');
    });
  });

  describe('anti-stampede: M concurrent cold callers on the same key', () => {
    it('calls buildFn exactly once even when all callers arrive before the build resolves', async () => {
      const pool = new LeasePool<string>();
      let callCount = 0;
      let resolve!: (v: string) => void;
      const buildPromise = new Promise<string>((res) => {
        resolve = res;
      });
      const buildFn = async () => {
        callCount++;
        return buildPromise;
      };

      const leases = [
        pool.lease('key', buildFn),
        pool.lease('key', buildFn),
        pool.lease('key', buildFn),
      ];

      resolve('client-b');
      const results = await Promise.all(leases);

      expect(callCount).toBe(1);
      expect(results).toEqual(['client-b', 'client-b', 'client-b']);
    });
  });

  describe('evict-on-reject', () => {
    it('removes the key when the build rejects so the next lease rebuilds', async () => {
      const pool = new LeasePool<string>();
      let callCount = 0;
      const buildFn = jest.fn().mockImplementationOnce(async () => {
        callCount++;
        throw new Error('build failed');
      });
      buildFn.mockImplementationOnce(async () => {
        callCount++;
        return 'client-c';
      });

      await expect(pool.lease('key', buildFn)).rejects.toThrow('build failed');

      const result = await pool.lease('key', buildFn);
      expect(result).toBe('client-c');
      expect(callCount).toBe(2);
    });

    it('propagates the rejection to callers waiting on the same in-flight build', async () => {
      const pool = new LeasePool<string>();
      let reject!: (e: Error) => void;
      const buildPromise = new Promise<string>((_, rej) => {
        reject = rej;
      });
      const buildFn = async () => buildPromise;

      const p1 = pool.lease('key', buildFn);
      const p2 = pool.lease('key', buildFn);

      reject(new Error('concurrent fail'));

      await expect(p1).rejects.toThrow('concurrent fail');
      await expect(p2).rejects.toThrow('concurrent fail');
    });
  });

  describe('isolation: distinct keys', () => {
    it('calls buildFn independently for different keys', async () => {
      const pool = new LeasePool<string>();
      let aCount = 0;
      let bCount = 0;

      const clientA = await pool.lease('key-a', async () => {
        aCount++;
        return 'client-a';
      });
      const clientB = await pool.lease('key-b', async () => {
        bCount++;
        return 'client-b';
      });

      expect(aCount).toBe(1);
      expect(bCount).toBe(1);
      expect(clientA).toBe('client-a');
      expect(clientB).toBe('client-b');
    });
  });
});
