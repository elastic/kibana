/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiVerifierRegistry } from './registry';
import type { KiVerifier, KnowledgeIndicator } from './types';

const makeVerifier = (overrides: Partial<KiVerifier> & { id: string }): KiVerifier => ({
  applies: () => true,
  verify: jest.fn(async () => ({ verifier: overrides.id, passed: true })),
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

  it('getApplicable returns only verifiers that apply, in registration order', () => {
    const ki: KnowledgeIndicator = { type: 'esql' };
    const applies = makeVerifier({ id: 'applies', applies: () => true });
    const skips = makeVerifier({ id: 'skips', applies: () => false });
    const alsoApplies = makeVerifier({
      id: 'also',
      applies: (candidate) => candidate.type === 'esql',
    });
    registry.register(applies);
    registry.register(skips);
    registry.register(alsoApplies);

    expect(registry.getApplicable(ki)).toEqual([applies, alsoApplies]);
  });

  it('getApplicable is empty when nothing is registered', () => {
    expect(registry.getApplicable({})).toEqual([]);
  });
});
