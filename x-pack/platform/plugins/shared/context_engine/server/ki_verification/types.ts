/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * A Knowledge Indicator (KI) to verify. Fields mirror the base AI index
 * mappings (`ai-index@mappings`).
 */
export interface KnowledgeIndicator {
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

/** Context passed to each verifier when it runs. */
export interface KiVerifierContext {
  esClient: ElasticsearchClient;
  logger: Logger;
  abortSignal?: AbortSignal;
}

/**
 * Context for {@link KiVerificationService.verifyKi}. `isEnabled` gates the run
 * on the `contextEngine:enabled` feature flag.
 */
export interface KiVerificationContext extends KiVerifierContext {
  isEnabled: boolean;
  /** Verifier ids to run; at least one id is required. */
  verifiers?: string[];
}

/** Outcome a verifier reports for one KI. A failure must carry a reason. */
export type KiVerifierOutcome = { passed: true } | { passed: false; reason: string };

/** A {@link KiVerifierOutcome} attributed to a verifier by the framework. */
export type KiVerifierResult = KiVerifierOutcome & { verifier: string };

export interface KiVerifier {
  readonly id: string;
  /** Whether this verifier has anything to check for the given KI. */
  applies(ki: KnowledgeIndicator, context: KiVerifierContext): boolean;
  verify(ki: KnowledgeIndicator, context: KiVerifierContext): Promise<KiVerifierOutcome>;
}

/**
 * Aggregated outcome. `passed` is true only when all applicable verifiers
 * passed.
 */
export interface KiVerificationSummary {
  passed: boolean;
  results: KiVerifierResult[];
}
