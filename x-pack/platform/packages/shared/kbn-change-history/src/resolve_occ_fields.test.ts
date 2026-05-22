/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChangeHistoryInvalidOccError } from './errors';
import { resolveOccFields } from './resolve_occ_fields';
import type { ObjectChange } from './types';

const baseChange = (): ObjectChange => ({
  objectType: 'rule',
  objectId: 'id-1',
  snapshot: { name: 'Rule' },
});

describe('resolveOccFields', () => {
  it('decodes primaryStoreVersion branch', () => {
    expect(
      resolveOccFields({
        ...baseChange(),
        primaryStoreVersion: 'WzQsMV0=',
      })
    ).toEqual({ seqNo: 4, primaryTerm: 1 });
  });

  it('uses numeric seqNo and primaryTerm branch', () => {
    expect(
      resolveOccFields({
        ...baseChange(),
        seqNo: 10,
        primaryTerm: 2,
      })
    ).toEqual({ seqNo: 10, primaryTerm: 2 });
  });

  it('rejects both branches', () => {
    expect(() =>
      resolveOccFields({
        ...baseChange(),
        primaryStoreVersion: 'WzQsMV0=',
        seqNo: 1,
        primaryTerm: 1,
      })
    ).toThrow(ChangeHistoryInvalidOccError);
  });

  it('rejects neither branch', () => {
    expect(() => resolveOccFields(baseChange())).toThrow(ChangeHistoryInvalidOccError);
  });

  it('rejects partial numeric branch (seqNo only)', () => {
    expect(() =>
      resolveOccFields({
        ...baseChange(),
        seqNo: 1,
      })
    ).toThrow(ChangeHistoryInvalidOccError);
  });

  it('rejects partial numeric branch (primaryTerm only)', () => {
    expect(() =>
      resolveOccFields({
        ...baseChange(),
        primaryTerm: 1,
      })
    ).toThrow(ChangeHistoryInvalidOccError);
  });

  it('treats empty primaryStoreVersion as missing (neither branch)', () => {
    expect(() =>
      resolveOccFields({
        ...baseChange(),
        primaryStoreVersion: '',
      })
    ).toThrow(ChangeHistoryInvalidOccError);
  });

  it('rejects non-integer seqNo', () => {
    expect(() =>
      resolveOccFields({
        ...baseChange(),
        seqNo: 1.5,
        primaryTerm: 1,
      })
    ).toThrow(ChangeHistoryInvalidOccError);
  });

  it('accepts seqNo 0 and primaryTerm 0 from a first primary write', () => {
    expect(
      resolveOccFields({
        ...baseChange(),
        seqNo: 0,
        primaryTerm: 0,
      })
    ).toEqual({ seqNo: 0, primaryTerm: 0 });
  });
});
