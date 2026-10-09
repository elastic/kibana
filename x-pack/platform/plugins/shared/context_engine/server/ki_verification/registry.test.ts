/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiVerifierRegistry } from './registry';
import type { KiVerifier } from './types';

const makeVerifier = (overrides: Partial<KiVerifier> & { id: string }): KiVerifier => ({
  applies: () => true,
  verify: jest.fn(async () => ({ passed: true as const })),
  ...overrides,
});

describe('KiVerifierRegistry', () => {
  let registry: KiVerifierRegistry;

  beforeEach(() => {
    registry = new KiVerifierRegistry();
  });

  it('registers and returns verifiers in registration order', () => {
    const a = makeVerifier({ id: 'a' });
    const b = makeVerifier({ id: 'b' });
    registry.register(a);
    registry.register(b);

    expect(registry.getAll()).toEqual([a, b]);
  });

  it('throws when a verifier id is registered twice', () => {
    registry.register(makeVerifier({ id: 'dup' }));

    expect(() => registry.register(makeVerifier({ id: 'dup' }))).toThrow(
      "KI verifier 'dup' is already registered"
    );
  });

  it('getAll is empty when nothing is registered', () => {
    expect(registry.getAll()).toEqual([]);
  });
});
