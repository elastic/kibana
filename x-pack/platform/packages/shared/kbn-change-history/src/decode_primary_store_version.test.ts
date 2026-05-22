/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodePrimaryStoreVersion } from './decode_primary_store_version';
import { ChangeHistoryInvalidPrimaryStoreVersionError } from './errors';
import { encodePrimaryStoreVersion } from '../test_utils_occ';

describe('decodePrimaryStoreVersion', () => {
  it('parses Saved Objects opaque version into seqNo and primaryTerm', () => {
    expect(decodePrimaryStoreVersion('WzQsMV0=')).toEqual({
      seqNo: 4,
      primaryTerm: 1,
    });
  });

  it('round-trips values produced by encodePrimaryStoreVersion', () => {
    const opaque = encodePrimaryStoreVersion(12, 3);
    expect(decodePrimaryStoreVersion(opaque)).toEqual({
      seqNo: 12,
      primaryTerm: 3,
    });
  });

  it('throws ChangeHistoryInvalidPrimaryStoreVersionError for non-base64 JSON', () => {
    expect(() => decodePrimaryStoreVersion('[1,4]')).toThrow(
      ChangeHistoryInvalidPrimaryStoreVersionError
    );
  });

  it('throws when decoded JSON is not a two-integer array', () => {
    const threeTuple = Buffer.from(JSON.stringify([1, 2, 3]), 'utf8').toString('base64');
    expect(() => decodePrimaryStoreVersion(threeTuple)).toThrow(
      ChangeHistoryInvalidPrimaryStoreVersionError
    );
  });

  it('throws when decoded tuple contains non-integers', () => {
    const bad = Buffer.from(JSON.stringify([1.1, 2]), 'utf8').toString('base64');
    expect(() => decodePrimaryStoreVersion(bad)).toThrow(
      ChangeHistoryInvalidPrimaryStoreVersionError
    );
  });

  it('exposes primaryStoreVersion on the error', () => {
    const bad = 'not-valid';
    try {
      decodePrimaryStoreVersion(bad);
      throw new Error('expected decodePrimaryStoreVersion to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ChangeHistoryInvalidPrimaryStoreVersionError);
      expect((error as ChangeHistoryInvalidPrimaryStoreVersionError).primaryStoreVersion).toBe(bad);
    }
  });
});
