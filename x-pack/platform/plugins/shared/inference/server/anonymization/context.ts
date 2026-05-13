/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A single entry in the token map tracking an anonymized value.
 */
export interface TokenEntry {
  /** The original (unanonymized) value. */
  original: string;
  /** The entity class label (e.g. 'IP', 'EMAIL', 'HOST_NAME'). */
  entityClass: string;
}

/** Matches tokens produced by generateToken: `<ENTITY_CLASS>_<32 hex chars>`. */
const TOKEN_RESTORE_REGEX = /\b([A-Z][A-Z0-9_]*)_([0-9a-f]{32})\b/g;

/**
 * Per-call context handle for the workflow-driven anonymization POC.
 *
 * Holds the per-session salt (derived from `deriveSalt`) and a mutable token map
 * that maps from generated tokens to their original values. The map enables
 * idempotent token generation: the same PII value seen twice in one call always
 * receives the same token, and cross-turn determinism is achieved because the
 * salt is stable within a session.
 *
 * There is no module-level state — each instance is scoped to a single chatComplete call.
 */
export class AnonymizationContext {
  public readonly salt: string;
  public readonly tokenMap: Map<string, TokenEntry>;
  private readonly _fields: Map<string, unknown> = new Map();

  constructor(salt: string) {
    this.salt = salt;
    this.tokenMap = new Map();
  }

  /**
   * Record a token → original value mapping.
   * Idempotent: registering the same token twice with the same original is safe.
   */
  public addToken(token: string, original: string, entityClass: string): void {
    this.tokenMap.set(token, { original, entityClass });
  }

  /**
   * Look up the original value for a token.
   * Returns `undefined` if the token was not produced in this context.
   */
  public resolveToken(token: string): TokenEntry | undefined {
    return this.tokenMap.get(token);
  }

  /**
   * Store an anonymized event field value produced by an `ai.pii` step.
   * Used by `invokeAroundCompletion` to retrieve anonymized system/messages
   * without routing them through the YAML workflow output.
   */
  public setField(key: string, value: unknown): void {
    this._fields.set(key, value);
  }

  /** Retrieve a value stored by `setField`. Returns `undefined` when absent. */
  public getField(key: string): unknown {
    return this._fields.get(key);
  }

  /**
   * Replace all tokens in `text` with their original values using the token map.
   * Tokens absent from the map are left unchanged.
   */
  public restore(text: string): string {
    const re = new RegExp(TOKEN_RESTORE_REGEX.source, TOKEN_RESTORE_REGEX.flags);
    return text.replace(re, (fullMatch) => {
      const entry = this.tokenMap.get(fullMatch);
      return entry ? entry.original : fullMatch;
    });
  }
}
