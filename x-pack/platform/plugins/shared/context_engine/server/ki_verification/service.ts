/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiVerifierRegistry } from './registry';
import type {
  KiVerificationSummary,
  KiVerifierContext,
  KiVerifierResult,
  KnowledgeItemCandidate,
} from './types';

export class KiVerificationService {
  constructor(private readonly registry: KiVerifierRegistry) {}

  async verify(
    ki: KnowledgeItemCandidate,
    context: KiVerifierContext
  ): Promise<KiVerificationSummary> {
    const results: KiVerifierResult[] = [];

    for (const verifier of this.registry.getAll()) {
      try {
        results.push(await verifier.verify(ki, context));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        context.logger.warn(`KI verifier '${verifier.id}' failed: ${errorMessage}`);
        results.push({ verifier: verifier.id, status: 'invalid', messages: [errorMessage] });
      }
    }

    return {
      valid: results.every((result) => result.status !== 'invalid'),
      results,
    };
  }
}
