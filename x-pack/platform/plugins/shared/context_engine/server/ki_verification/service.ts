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
  KiVerifierContext,
  KiVerifierResult,
  KnowledgeIndicator,
} from './types';

export class KiVerificationService {
  constructor(private readonly registry: KiVerifierRegistry) {}

  /**
   * Runs all applicable verifiers and aggregates their results, stamping each
   * result with its verifier id. A verifier that throws from `applies` or
   * `verify` is recorded as a failure and does not abort the run. No-op when the
   * feature flag is off.
   */
  async verifyKi(
    ki: KnowledgeIndicator,
    { isEnabled, verifiers, ...verifierContext }: KiVerificationContext
  ): Promise<KiVerificationSummary> {
    if (!isEnabled) {
      return { passed: true, results: [] };
    }

    const allowlist = verifiers && verifiers.length > 0 ? new Set(verifiers) : null;
    const results: KiVerifierResult[] = [];

    for (const verifier of this.registry.getAll()) {
      if (allowlist && !allowlist.has(verifier.id)) {
        continue;
      }

      let applies: boolean;
      try {
        applies = verifier.applies(ki, verifierContext);
      } catch (error) {
        results.push(this.toFailure(verifier.id, error, verifierContext));
        continue;
      }
      if (!applies) {
        continue;
      }

      try {
        const outcome = await verifier.verify(ki, verifierContext);
        results.push({ ...outcome, verifier: verifier.id });
      } catch (error) {
        results.push(this.toFailure(verifier.id, error, verifierContext));
      }
    }

    return { passed: results.every((result) => result.passed), results };
  }

  private toFailure(id: string, error: unknown, { logger }: KiVerifierContext): KiVerifierResult {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(`KI verifier '${id}' threw: ${reason}`);
    return { verifier: id, passed: false, reason };
  }
}
