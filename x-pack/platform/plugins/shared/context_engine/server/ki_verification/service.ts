/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiVerifierRegistry } from './registry';
import type {
  KiVerificationContext,
  KiVerificationSummary,
  KiVerifierResult,
  KnowledgeIndicator,
} from './types';

export class KiVerificationService {
  constructor(private readonly registry: KiVerifierRegistry) {}

  /**
   * Runs all applicable verifiers and aggregates their validation results.
   * Verifier exceptions propagate because they represent execution failures,
   * not invalid KI content. No-op when the feature flag is off.
   */
  async verifyKi(
    ki: KnowledgeIndicator,
    { isEnabled, verifiers, ...verifierContext }: KiVerificationContext
  ): Promise<KiVerificationSummary> {
    if (!isEnabled) {
      return { passed: true, results: [] };
    }

    if (!verifiers || verifiers.length === 0) {
      return { passed: true, results: [] };
    }

    const allowlist = new Set(verifiers);
    const results: KiVerifierResult[] = [];

    for (const verifier of this.registry.getAll()) {
      if (!allowlist.has(verifier.id)) {
        continue;
      }

      if (!verifier.applies(ki, verifierContext)) {
        continue;
      }

      const outcome = await verifier.verify(ki, verifierContext);
      results.push({ ...outcome, verifier: verifier.id });
    }

    return { passed: results.every((result) => result.passed), results };
  }
}
