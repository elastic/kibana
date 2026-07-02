/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMergePatch } from './apply_merge_patch';

describe('applyMergePatch', () => {
  // Test cases from RFC 7386, Appendix A.
  const rfc7386Cases: Array<{ target: unknown; patch: unknown; expected: unknown }> = [
    { target: { a: 'b' }, patch: { a: 'c' }, expected: { a: 'c' } },
    { target: { a: 'b' }, patch: { b: 'c' }, expected: { a: 'b', b: 'c' } },
    { target: { a: 'b' }, patch: { a: null }, expected: {} },
    { target: { a: 'b', b: 'c' }, patch: { a: null }, expected: { b: 'c' } },
    { target: { a: ['b'] }, patch: { a: 'c' }, expected: { a: 'c' } },
    { target: { a: 'c' }, patch: { a: ['b'] }, expected: { a: ['b'] } },
    {
      target: { a: { b: 'c' } },
      patch: { a: { b: 'd', c: null } },
      expected: { a: { b: 'd' } },
    },
    { target: { a: [{ b: 'c' }] }, patch: { a: [1] }, expected: { a: [1] } },
    { target: ['a', 'b'], patch: ['c', 'd'], expected: ['c', 'd'] },
    { target: { a: 'b' }, patch: ['c'], expected: ['c'] },
    { target: { a: 'foo' }, patch: null, expected: null },
    { target: { a: 'foo' }, patch: 'bar', expected: 'bar' },
    { target: { e: null }, patch: { a: 1 }, expected: { e: null, a: 1 } },
    { target: [1, 2], patch: { a: 'b', c: null }, expected: { a: 'b' } },
    { target: {}, patch: { a: { bb: { ccc: null } } }, expected: { a: { bb: {} } } },
  ];

  it.each(rfc7386Cases)('RFC 7386: $target + $patch → $expected', ({ target, patch, expected }) => {
    expect(applyMergePatch(target, patch)).toEqual(expected);
  });

  it('deletes nested keys via null while merging siblings', () => {
    const target = { legend: { placement: 'outside', position: 'right', columns: 2 } };
    const patch = { legend: { position: 'bottom', columns: null } };

    expect(applyMergePatch(target, patch)).toEqual({
      legend: { placement: 'outside', position: 'bottom' },
    });
  });

  it('replaces arrays wholesale, never merging elements', () => {
    const target = { layers: [{ type: 'line' }, { type: 'bar' }] };
    const patch = { layers: [{ type: 'area' }] };

    expect(applyMergePatch(target, patch)).toEqual({ layers: [{ type: 'area' }] });
  });

  it('does not mutate the target or the patch', () => {
    const target = { a: { b: 'c' }, d: [1, 2] };
    const patch = { a: { b: 'x', e: null }, d: [3] };
    const targetSnapshot = JSON.parse(JSON.stringify(target));
    const patchSnapshot = JSON.parse(JSON.stringify(patch));

    applyMergePatch(target, patch);

    expect(target).toEqual(targetSnapshot);
    expect(patch).toEqual(patchSnapshot);
  });
});
