/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiVerifier } from './types';

export class KiVerifierRegistry {
  private readonly verifiers = new Map<string, KiVerifier>();

  register(verifier: KiVerifier): void {
    if (this.verifiers.has(verifier.id)) {
      throw new Error(`KI verifier '${verifier.id}' is already registered`);
    }
    this.verifiers.set(verifier.id, verifier);
  }

  get(id: string): KiVerifier | undefined {
    return this.verifiers.get(id);
  }

  getAll(): KiVerifier[] {
    return [...this.verifiers.values()];
  }
}
