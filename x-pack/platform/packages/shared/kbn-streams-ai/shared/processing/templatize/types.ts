/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Result of a single token analysis */
export interface TokenMatch {
  patterns: number[];
  /** Literal token text */
  value: string;
}

/** Template representation of one log message */
export interface MessageTemplate {
  /** Delimiter discovered for this set of messages */
  delimiter: string;
  /** Per‑token metadata */
  columns: Array<{
    value: string;
    tokens: TokenMatch[];
  }>; // [column][token]
  /** Original message */
  original: string;
}

export interface TemplateRoot {
  delimiter: string;
  columns: Array<{
    tokens: Array<{
      pattern: string;
      values: string[];
    }>;
  }>;
  values: Record<string, string[]>;
  formatted: {
    display: string;
    grok: string;
  };
}

/** Final API return type */
export interface ExtractTemplateResult {
  /** Root template common to all messages */
  root: TemplateRoot;
  /** One entry per message */
  templates: MessageTemplate[];
}
