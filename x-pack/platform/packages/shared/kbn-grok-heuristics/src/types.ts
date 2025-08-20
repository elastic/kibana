/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a single log line with masked content and their literal values.
 */
export interface MaskedMessage {
  masked: string;
  literals: string[];
}

/**
 * Represents a column for a single log line.
 */
export interface SingleLineColumn {
  value: string;
  tokens: SingleLineToken[];
}

/**
 * Represents a token in a single line column with possible GROK patterns and exclusions determined.
 */
export interface SingleLineToken {
  value: string;
  patterns: number[];
  excludedPatterns: number[];
}

/**
 * Represents a normalized column derived from multiple log lines.
 */
export interface NormalizedColumn<T = NormalizedToken> {
  tokens: T[];
  whitespace: {
    minLeading: number;
    maxLeading: number;
    minTrailing: number;
    maxTrailing: number;
  };
}

/**
 * Represents a token in a normalized column with possible GROK patterns and exclusions determined.
 */
export interface NormalizedToken {
  values: string[];
  patterns: number[];
  excludedPatterns: number[];
}

/**
 * Represents a column of named tokens.
 */
export type NamedColumn = NormalizedColumn<NamedToken>;

/**
 * Represents either a literal value (id is `undefined`) or a named field and the GROK pattern used to extract its values.
 */
export interface NamedToken {
  id: string | undefined;
  pattern: string;
  values: string[];
}
