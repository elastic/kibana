/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

/**
 * A candidate knowledge item (KI) to verify before it is persisted to an AI
 * index. The fields mirror the base AI index mappings (`ai-index@mappings`).
 */
export interface KnowledgeItemCandidate {
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
}

export type KiVerifierStatus = 'valid' | 'invalid' | 'skipped' | 'error';

export interface KiVerifierResult {
  /** Id of the verifier that produced this result. */
  verifier: string;
  /**
   * `valid` when all checks passed, `invalid` when at least one check failed,
   * `skipped` when the verifier does not apply to the KI, and `error` when the
   * verifier could not complete its check (no judgment on the KI).
   */
  status: KiVerifierStatus;
  messages: string[];
}

/**
 * Minimal logger contract, satisfied by both core `Logger` and the workflow
 * step handler logger.
 */
export interface KiVerificationLogger {
  warn(message: string): void;
}

export interface KiVerifierContext {
  esClient: ElasticsearchClient;
  logger: KiVerificationLogger;
  abortSignal?: AbortSignal;
}

export interface KiVerifier {
  readonly id: string;
  verify(ki: KnowledgeItemCandidate, context: KiVerifierContext): Promise<KiVerifierResult>;
}

/**
 * `invalid` when any verifier reported the KI as invalid, `indeterminate` when
 * no verifier reported invalid but at least one could not complete its check,
 * `valid` otherwise.
 */
export type KiVerificationVerdict = 'valid' | 'invalid' | 'indeterminate';

export interface KiVerificationSummary {
  verdict: KiVerificationVerdict;
  results: KiVerifierResult[];
}
