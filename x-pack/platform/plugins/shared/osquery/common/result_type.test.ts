/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mapResultTypeToWire,
  mapWireToExplicitResultType,
  mapWireToResultType,
} from './result_type';

describe('mapWireToResultType', () => {
  it('returns undefined when neither boolean is stored', () => {
    expect(mapWireToResultType({})).toBeUndefined();
  });

  it('treats snapshot: true as snapshot even when removed is set', () => {
    expect(mapWireToResultType({ snapshot: true, removed: false })).toBe('snapshot');
    expect(mapWireToResultType({ snapshot: true })).toBe('snapshot');
  });

  it('treats a lone snapshot: false as differential (osquery default removed: true)', () => {
    expect(mapWireToResultType({ snapshot: false })).toBe('differential');
  });

  it('treats snapshot: false, removed: true as differential', () => {
    expect(mapWireToResultType({ snapshot: false, removed: true })).toBe('differential');
  });

  it('treats snapshot: false, removed: false as added-only', () => {
    expect(mapWireToResultType({ snapshot: false, removed: false })).toBe(
      'differential_added_only'
    );
  });

  it('re-encodes { snapshot: false } without emitting removed: false', () => {
    expect(mapWireToResultType({ snapshot: false })).toBe('differential');
    expect(mapResultTypeToWire('differential')).toEqual({ snapshot: false, removed: true });
    expect(mapResultTypeToWire('differential')).not.toHaveProperty('removed', false);
  });
});

describe('mapWireToExplicitResultType', () => {
  it('treats a lone snapshot: false as an explicit differential override', () => {
    expect(mapWireToExplicitResultType({ snapshot: false })).toBe('differential');
  });

  it('does not treat snapshot: true as an explicit override', () => {
    expect(mapWireToExplicitResultType({ snapshot: true, removed: false })).toBeUndefined();
  });
});
