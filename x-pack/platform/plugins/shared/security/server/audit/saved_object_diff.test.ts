/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeJsonPatch } from './saved_object_diff';
import type { ExtendedJsonPatch } from './saved_object_diff';

const opAt = (patch: ExtendedJsonPatch, path: string) => patch.ops.find((op) => op.path === path);
const noOpPaths = (patch: ExtendedJsonPatch) => patch.noOps.map((noOp) => noOp.path);

// ---------------------------------------------------------------------------
// computeJsonPatch
// ---------------------------------------------------------------------------

describe('computeJsonPatch', () => {
  it('returns the correct format discriminator', () => {
    expect(computeJsonPatch({ a: {}, b: {} }).format).toBe('json_patch_extended');
  });

  describe('no changes', () => {
    it('emits empty ops and all keys as noOps when objects are identical', () => {
      const patch = computeJsonPatch({
        a: { name: 'foo', count: 3 },
        b: { name: 'foo', count: 3 },
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch).sort()).toEqual(['/count', '/name']);
    });

    it('emits empty ops and noOps for two empty objects', () => {
      const patch = computeJsonPatch({ a: {}, b: {} });

      expect(patch.ops).toEqual([]);
      expect(patch.noOps).toEqual([]);
    });
  });

  describe('add operations', () => {
    it('emits an add op (value only) for a field present in b but not a', () => {
      const patch = computeJsonPatch({ a: { existing: 1 }, b: { existing: 1, newField: 'hello' } });

      expect(opAt(patch, '/newField')).toEqual({ op: 'add', path: '/newField', value: 'hello' });
      expect(opAt(patch, '/newField')).not.toHaveProperty('oldValue');
      expect(noOpPaths(patch)).toContain('/existing');
    });

    it('emits an add op for a nested field under an existing parent', () => {
      const patch = computeJsonPatch({
        a: { config: { timeout: 30 } },
        b: { config: { timeout: 30, retries: 3 } },
      });

      expect(opAt(patch, '/config/retries')).toEqual({
        op: 'add',
        path: '/config/retries',
        value: 3,
      });
      expect(noOpPaths(patch)).toContain('/config/timeout');
    });
  });

  describe('remove operations', () => {
    it('emits a remove op (oldValue only) for a field present in a but not b', () => {
      const patch = computeJsonPatch({ a: { existing: 1, removed: 'bye' }, b: { existing: 1 } });

      expect(opAt(patch, '/removed')).toEqual({ op: 'remove', path: '/removed', oldValue: 'bye' });
      expect(opAt(patch, '/removed')).not.toHaveProperty('value');
    });

    it('emits a remove op for a nested field removed from an existing parent', () => {
      const patch = computeJsonPatch({
        a: { config: { timeout: 30, legacy: true } },
        b: { config: { timeout: 30 } },
      });

      expect(opAt(patch, '/config/legacy')).toEqual({
        op: 'remove',
        path: '/config/legacy',
        oldValue: true,
      });
    });
  });

  describe('replace operations', () => {
    it('emits a replace op with both value and oldValue for a changed field', () => {
      const patch = computeJsonPatch({ a: { output: 'default' }, b: { output: 'logstash-prod' } });

      expect(opAt(patch, '/output')).toEqual({
        op: 'replace',
        path: '/output',
        value: 'logstash-prod',
        oldValue: 'default',
      });
    });

    it('detects changed number and boolean values', () => {
      const patch = computeJsonPatch({
        a: { timeout: 30, on: false },
        b: { timeout: 60, on: true },
      });

      expect(opAt(patch, '/timeout')).toMatchObject({ value: 60, oldValue: 30 });
      expect(opAt(patch, '/on')).toMatchObject({ value: true, oldValue: false });
    });

    it('detects a change deep in a nested structure', () => {
      const patch = computeJsonPatch({
        a: { config: { auth: { method: 'basic' } } },
        b: { config: { auth: { method: 'token' } } },
      });

      expect(opAt(patch, '/config/auth/method')).toMatchObject({
        value: 'token',
        oldValue: 'basic',
      });
    });

    it('emits replace ops for multiple changed fields', () => {
      const patch = computeJsonPatch({
        a: { x: 1, y: 'a', z: true },
        b: { x: 2, y: 'b', z: false },
      });

      expect(patch.ops).toHaveLength(3);
      expect(patch.ops.every((op) => op.op === 'replace')).toBe(true);
    });
  });

  describe('array handling', () => {
    it('treats unchanged arrays as equal (noOp, no op)', () => {
      const patch = computeJsonPatch({
        a: { tags: ['a', 'b', 'c'] },
        b: { tags: ['a', 'b', 'c'] },
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/tags');
    });

    it('detects arrays with different content as changed', () => {
      const patch = computeJsonPatch({ a: { tags: ['a', 'b'] }, b: { tags: ['a', 'b', 'c'] } });

      expect(opAt(patch, '/tags')).toMatchObject({
        value: ['a', 'b', 'c'],
        oldValue: ['a', 'b'],
      });
    });

    it('detects arrays with the same elements in a different order as changed', () => {
      const patch = computeJsonPatch({ a: { tags: ['a', 'b'] }, b: { tags: ['b', 'a'] } });

      expect(opAt(patch, '/tags')).toBeDefined();
    });

    it('treats an array replaced by a non-array as changed', () => {
      const patch = computeJsonPatch({ a: { value: [1, 2, 3] }, b: { value: 'flat' } });

      expect(opAt(patch, '/value')).toMatchObject({ value: 'flat', oldValue: [1, 2, 3] });
    });

    it('treats arrays of objects whose keys are in a different order as equal', () => {
      // e.g. dashboard panels re-serialized by the client, or a migration spread
      const patch = computeJsonPatch({
        a: { panels: [{ id: 'p1', gridData: { x: 0, y: 0 } }] },
        b: { panels: [{ gridData: { y: 0, x: 0 }, id: 'p1' }] },
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/panels');
    });

    it('detects a changed value inside an array of objects', () => {
      const patch = computeJsonPatch({
        a: { panels: [{ id: 'p1', gridData: { x: 0, y: 0 } }] },
        b: { panels: [{ id: 'p1', gridData: { x: 1, y: 0 } }] },
      });

      expect(opAt(patch, '/panels')).toMatchObject({
        op: 'replace',
        value: [{ id: 'p1', gridData: { x: 1, y: 0 } }],
        oldValue: [{ id: 'p1', gridData: { x: 0, y: 0 } }],
      });
    });

    it('does not treat an array as equal to a non-array with the same JSON shape', () => {
      const patch = computeJsonPatch({ a: { value: [] }, b: { value: {} } });

      expect(opAt(patch, '/value')).toMatchObject({ op: 'replace', value: {}, oldValue: [] });
    });
  });

  describe('literal dots in keys', () => {
    it('flattens a literal-dot key to a single pointer segment', () => {
      const patch = computeJsonPatch({ a: {}, b: { 'host.name': 'web-01' } });

      expect(opAt(patch, '/host.name')).toStrictEqual({
        op: 'add',
        path: '/host.name',
        value: 'web-01',
      });
    });

    it('does not collide a literal-dot key with an identically-spelled nested path', () => {
      const patch = computeJsonPatch({
        a: { 'host.name': 'flat' },
        b: { host: { name: 'nested' } },
      });

      expect(opAt(patch, '/host.name')).toStrictEqual({
        op: 'remove',
        path: '/host.name',
        oldValue: 'flat',
      });
      expect(opAt(patch, '/host/name')).toStrictEqual({
        op: 'add',
        path: '/host/name',
        value: 'nested',
      });
    });

    it('treats an unchanged literal-dot key as a noOp', () => {
      const patch = computeJsonPatch({ a: { 'host.name': 'x' }, b: { 'host.name': 'x' } });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/host.name');
    });

    it('redacts a top-level key containing a literal dot', () => {
      const patch = computeJsonPatch({
        a: {},
        b: { 'secret.key': 'hunter2' },
        fieldsToRedact: ['secret.key'],
      });

      const op = opAt(patch, '/secret.key');
      expect(op).toBeDefined();
      expect(op!.value).not.toBe('hunter2');
    });
  });

  describe('empty object handling', () => {
    it('emits an add op when a field appears as an empty object', () => {
      const patch = computeJsonPatch({ a: {}, b: { settings: {} } });

      expect(opAt(patch, '/settings')).toStrictEqual({ op: 'add', path: '/settings', value: {} });
    });

    it('emits a remove op when an empty-object field disappears', () => {
      const patch = computeJsonPatch({ a: { settings: {} }, b: {} });

      expect(opAt(patch, '/settings')).toStrictEqual({
        op: 'remove',
        path: '/settings',
        oldValue: {},
      });
    });

    it('treats an unchanged empty-object field as a noOp', () => {
      const patch = computeJsonPatch({ a: { settings: {} }, b: { settings: {} } });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/settings');
    });

    it('emits a replace op when a leaf value becomes an empty object', () => {
      const patch = computeJsonPatch({ a: { value: 5 }, b: { value: {} } });

      expect(opAt(patch, '/value')).toStrictEqual({
        op: 'replace',
        path: '/value',
        value: {},
        oldValue: 5,
      });
    });

    it('handles a nested empty object at its full path', () => {
      const patch = computeJsonPatch({ a: { outer: { inner: 1 } }, b: { outer: { inner: {} } } });

      expect(opAt(patch, '/outer/inner')).toStrictEqual({
        op: 'replace',
        path: '/outer/inner',
        value: {},
        oldValue: 1,
      });
    });

    it('leaves empty objects inside arrays untouched (arrays compare wholesale)', () => {
      const patch = computeJsonPatch({ a: { panels: [{}] }, b: { panels: [{}, {}] } });

      expect(opAt(patch, '/panels')).toStrictEqual({
        op: 'replace',
        path: '/panels',
        value: [{}, {}],
        oldValue: [{}],
      });
    });
  });

  describe('fieldsToRedact (sensitive field redaction)', () => {
    it('replaces value and oldValue with the redacted sentinel for a changed field', () => {
      const patch = computeJsonPatch({
        a: { apiKey: 'old-secret', name: 'agent' },
        b: { apiKey: 'new-secret', name: 'agent' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({
        op: 'replace',
        path: '/apiKey',
        value: '[redacted]',
        oldValue: '[redacted]',
      });
    });

    it('still detects the field as changed (does not suppress the op)', () => {
      const patch = computeJsonPatch({
        a: { secret: 'old' },
        b: { secret: 'new' },
        fieldsToRedact: ['secret'],
      });

      expect(opAt(patch, '/secret')).toBeDefined();
    });

    it('does not emit an op for an unchanged redacted field', () => {
      const patch = computeJsonPatch({
        a: { secret: 'same' },
        b: { secret: 'same' },
        fieldsToRedact: ['secret'],
      });

      expect(patch.ops).toEqual([]);
      expect(noOpPaths(patch)).toContain('/secret');
    });

    it('redacts children of a redacted field prefix', () => {
      const patch = computeJsonPatch({
        a: { credentials: { user: 'alice', password: 'p1' } },
        b: { credentials: { user: 'alice', password: 'p2' } },
        fieldsToRedact: ['credentials'],
      });

      expect(opAt(patch, '/credentials/password')).toEqual({
        op: 'replace',
        path: '/credentials/password',
        value: '[redacted]',
        oldValue: '[redacted]',
      });
      expect(noOpPaths(patch)).toContain('/credentials/user');
    });

    it('does not redact fields outside the fieldsToRedact list', () => {
      const patch = computeJsonPatch({
        a: { secret: 'old', name: 'foo' },
        b: { secret: 'new', name: 'bar' },
        fieldsToRedact: ['secret'],
      });

      expect(opAt(patch, '/name')).toMatchObject({ value: 'bar', oldValue: 'foo' });
    });

    it('redacts an added redacted field (value only)', () => {
      const patch = computeJsonPatch({
        a: { name: 'agent' },
        b: { name: 'agent', apiKey: 'new-secret' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({ op: 'add', path: '/apiKey', value: '[redacted]' });
    });

    it('redacts a removed redacted field (oldValue only)', () => {
      const patch = computeJsonPatch({
        a: { name: 'agent', apiKey: 'old-secret' },
        b: { name: 'agent' },
        fieldsToRedact: ['apiKey'],
      });

      expect(opAt(patch, '/apiKey')).toEqual({
        op: 'remove',
        path: '/apiKey',
        oldValue: '[redacted]',
      });
    });
  });

  describe('fieldSizeLimit', () => {
    it('passes through values below the limit unchanged', () => {
      const patch = computeJsonPatch({
        a: { name: 'old' },
        b: { name: 'new' },
        fieldSizeLimit: 1024,
      });

      expect(opAt(patch, '/name')).toMatchObject({ value: 'new', oldValue: 'old' });
    });

    it('replaces a value exceeding the limit with the sentinel', () => {
      const patch = computeJsonPatch({
        a: { data: 'small' },
        b: { data: 'x'.repeat(200) },
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/data')).toMatchObject({
        value: 'Value above fieldSizeLimit',
        oldValue: 'small',
      });
    });

    it('replaces an oversized non-string value using JSON.stringify size', () => {
      const patch = computeJsonPatch({
        a: { tags: ['small'] },
        b: { tags: new Array(50).fill('abcdefghij') },
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/tags')).toMatchObject({
        value: 'Value above fieldSizeLimit',
        oldValue: ['small'],
      });
    });

    it('replaces oldValue too if it exceeds the limit', () => {
      const patch = computeJsonPatch({
        a: { data: 'y'.repeat(200) },
        b: { data: 'small' },
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/data')).toMatchObject({
        value: 'small',
        oldValue: 'Value above fieldSizeLimit',
      });
    });

    it('replaces an added value if it exceeds the limit', () => {
      const patch = computeJsonPatch({ a: {}, b: { data: 'z'.repeat(200) }, fieldSizeLimit: 100 });

      expect(opAt(patch, '/data')).toEqual({
        op: 'add',
        path: '/data',
        value: 'Value above fieldSizeLimit',
      });
    });

    it('replaces a removed oldValue if it exceeds the limit', () => {
      const patch = computeJsonPatch({ a: { data: 'z'.repeat(200) }, b: {}, fieldSizeLimit: 100 });

      expect(opAt(patch, '/data')).toEqual({
        op: 'remove',
        path: '/data',
        oldValue: 'Value above fieldSizeLimit',
      });
    });

    it('applies no limit when fieldSizeLimit is not provided', () => {
      const bigValue = 'x'.repeat(200_000);
      const patch = computeJsonPatch({ a: { data: 'small' }, b: { data: bigValue } });

      expect(opAt(patch, '/data')).toMatchObject({ value: bigValue });
    });

    it('redaction takes precedence over the size limit', () => {
      const patch = computeJsonPatch({
        a: { secret: 'small' },
        b: { secret: 'x'.repeat(200) },
        fieldsToRedact: ['secret'],
        fieldSizeLimit: 100,
      });

      expect(opAt(patch, '/secret')).toMatchObject({ value: '[redacted]', oldValue: '[redacted]' });
    });
  });

  describe('JSON Pointer path encoding', () => {
    it('encodes a key containing ~ as ~0', () => {
      const patch = computeJsonPatch({ a: { 'a~b': 1 }, b: { 'a~b': 2 } });
      expect(patch.ops[0].path).toBe('/a~0b');
    });

    it('encodes a key containing / as ~1', () => {
      const patch = computeJsonPatch({ a: { 'a/b': 1 }, b: { 'a/b': 2 } });
      expect(patch.ops[0].path).toBe('/a~1b');
    });
  });

  describe('RFC example from the design doc', () => {
    it('produces the expected patch for the agent policy example', () => {
      const patch = computeJsonPatch({
        a: { data_output_id: 'default', legacy_mode: true },
        b: { data_output_id: 'logstash-prod', monitoring_enabled: ['logs', 'metrics'] },
      });

      expect(opAt(patch, '/data_output_id')).toMatchObject({
        op: 'replace',
        value: 'logstash-prod',
        oldValue: 'default',
      });
      expect(opAt(patch, '/monitoring_enabled')).toMatchObject({
        op: 'add',
        value: ['logs', 'metrics'],
      });
      expect(opAt(patch, '/legacy_mode')).toMatchObject({ op: 'remove', oldValue: true });
    });
  });
});
