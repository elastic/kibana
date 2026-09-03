/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiVerifierRegistry } from './registry';
import { errorTypeForTelemetry, isAbortError } from '../telemetry';
import type {
  KiVerificationContext,
  KiVerificationSummary,
  KiVerifierResult,
  KnowledgeIndicator,
} from './types';
import { KiVerificationInputError } from './errors';

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
      throw new KiVerificationInputError('verifiers must list at least one verifier id');
    }

    const results: KiVerifierResult[] = [];

    const seen = new Set<string>();
    const selectedVerifiers = verifiers.map((id) => {
      if (seen.has(id)) {
        throw new KiVerificationInputError(`Duplicate verifier id: "${id}"`);
      }
      seen.add(id);
      const verifier = this.registry.get(id);
      if (!verifier) {
        throw new KiVerificationInputError(`Unknown verifier id: "${id}"`);
      }

      return { id, verifier };
    });

    for (const { id, verifier } of selectedVerifiers) {
      try {
        if (!verifier.applies(ki, verifierContext)) {
          continue;
        }

        const outcome = await verifier.verify(ki, verifierContext);
        results.push({ ...outcome, verifier: id });
      } catch (error) {
        if (!isAbortError(error)) {
          verifierContext.logger.warn(`KI verifier '${id}' threw: ${errorTypeForTelemetry(error)}`);
        }
        throw error;
      }
    }

    return { passed: results.every((result) => result.passed), results };
  }
}
