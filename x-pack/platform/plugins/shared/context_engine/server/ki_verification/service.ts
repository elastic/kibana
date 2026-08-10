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
   * Runs all applicable verifiers and aggregates their results. A verifier that
   * throws is recorded as a failure and does not abort the run. No-op when the
   * feature flag is off.
   */
  async verifyKi(
    ki: KnowledgeIndicator,
    { isEnabled, ...verifierContext }: KiVerificationContext
  ): Promise<KiVerificationSummary> {
    if (!isEnabled) {
      return { passed: true, results: [] };
    }

    const results: KiVerifierResult[] = [];

    for (const verifier of this.registry.getApplicable(ki)) {
      try {
        results.push(await verifier.verify(ki, verifierContext));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        verifierContext.logger.warn(`KI verifier '${verifier.id}' threw: ${reason}`);
        results.push({ verifier: verifier.id, passed: false, reason });
      }
    }

    return { passed: results.every((result) => result.passed), results };
  }
}
