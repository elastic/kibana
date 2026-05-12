/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A single token map entry: maps a generated token back to the original value.
 */
export interface TokenEntry {
  original: string;
  entityClass: string;
}

/**
 * Minimal interface for the per-call anonymization context.
 * Satisfied structurally by `AnonymizationContext` (inference plugin) without
 * requiring a direct import from x-pack.
 *
 * The salt and tokenMap are opaque to the YAML layer — they travel only via the
 * `capabilities` map passed to hook handlers, never in the workflow event payload.
 */
export interface AnonymizationContextHandle {
  readonly salt: string;
  readonly tokenMap: Map<string, TokenEntry>;
}

/** Key used to store the context in the capabilities map passed to hook handlers. */
export const ANONYMIZATION_CONTEXT_CAPABILITY_KEY = 'anonymizationContext';
