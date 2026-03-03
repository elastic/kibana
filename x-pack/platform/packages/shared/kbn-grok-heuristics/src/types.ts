/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a single log line where highly specific patterns are masked.
 */
export interface MaskedMessage {
  /** The log line with highly specific patterns replaced by placeholders. */
  masked: string;
  /** The original values of the masked parts. */
  literals: string[];
}

/**
 * Represents a column extracted from a single log line.
 */
export interface SingleLineColumn {
  /** The raw content of the column. */
  value: string;
  /** Tokens providing additional information about the column's structure or content. */
  tokens: SingleLineToken[];
}

/**
 * Represents a token extracted from a single log line.
 */
export interface SingleLineToken {
  /** The raw content of the token. */
  value: string;
  /** Indices of GROK components that match the token. */
  patterns: number[];
  /** Indices of GROK components explicitly excluded from matching the token. */
  excludedPatterns: number[];
}

/**
 * Represents a normalized column derived from multiple log lines.
 */
export interface NormalizedColumn<T = NormalizedToken> {
  /** Normalized tokens for the column. */
  tokens: T[];
  /** Leading and trailing whitespace statistics for the column. */
  whitespace: {
    /** Minimum number of leading whitespace characters. */
    minLeading: number;
    /** Maximum number of leading whitespace characters. */
    maxLeading: number;
    /** Minimum number of trailing whitespace characters. */
    minTrailing: number;
    /** Maximum number of trailing whitespace characters. */
    maxTrailing: number;
  };
}

/**
 * Represents a token in a normalized column.
 */
export interface NormalizedToken {
  /** All unique values observed for this token. */
  values: string[];
  /** Indices of GROK components that match all observed values. */
  patterns: number[];
  /** Indices of GROK components that do not match any observed values. */
  excludedPatterns: number[];
}

/**
 * Represents a group of pattern nodes derived from normalized columns.
 */
export type GrokPatternGroup = NormalizedColumn<GrokPatternNode>;

/**
 * Represents a node in a pattern group, which can be either a named field or a literal value.
 */
export type GrokPatternNode = NamedFieldNode | LiteralValueNode;

/**
 * Represents a named field in a Grok pattern.
 */
export interface NamedFieldNode {
  /** Unique identifier for the field. */
  id: string;
  /** GROK component that can extract all observed values. (e.g. `YEAR`) */
  component: string;
  /** All unique values observed for this field. */
  values: string[];
}

/**
 * Represents a literal value in a Grok pattern.
 */
export interface LiteralValueNode {
  /** GROK pattern that can extract all observed values. (e.g. ` `, `\s+`, `\t`, `,`) */
  pattern: string;
}
