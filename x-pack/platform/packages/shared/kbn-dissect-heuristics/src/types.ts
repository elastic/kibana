/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a Dissect pattern with metadata
 */
export interface DissectPattern {
  /** The Dissect pattern string */
  pattern: string;
  /** Extracted fields with metadata */
  fields: DissectField[];
}

/**
 * Represents a field in the Dissect pattern
 */
export interface DissectField {
  /** Field name (e.g., "clientip", "field_1") */
  name: string;
  /** Sample values from the analyzed messages */
  values: string[];
  /** Position in the original messages */
  position: number;
  /** Applied modifiers */
  modifiers?: DissectModifiers;
}

/**
 * Modifiers that can be applied to a field
 */
export interface DissectModifiers {
  /** Right padding (->): handles variable trailing whitespace */
  rightPadding?: boolean;
  /** Skip field (?): field should not be extracted */
  skip?: boolean;
  /** Use named skip instead of anonymous */
  namedSkip?: boolean;
}

/**
 * Represents a delimiter in the delimiter tree
 */
export interface DelimiterNode {
  /** The literal delimiter string */
  literal: string;
  /** Position of this delimiter in each message */
  positions: number[];
  /** Median position across all messages */
  medianPosition: number;
  /** Position variance (for filtering) */
  variance?: number;
}

/**
 * Configuration for delimiter detection
 */
export interface DelimiterDetectionConfig {
  /** Minimum substring length to consider */
  minLength?: number;
  /** Maximum substring length to consider */
  maxLength?: number;
  /** Minimum number of messages delimiter must appear in */
  minFrequency?: number;
  /** Maximum position variance allowed */
  maxVariance?: number;
  /** Minimum score for delimiter candidate */
  minScore?: number;
}

/**
 * Result from getDissectProcessor()
 */
export interface DissectProcessorResult {
  /** Description of the log source (from LLM review) */
  description?: string;
  /** The dissect pattern string */
  pattern: string;
  /** The processor configuration */
  processor: {
    dissect: {
      field: string;
      pattern: string;
      append_separator?: string;
      ignore_missing?: boolean;
    };
  };
  /** Metadata about the extraction */
  metadata: {
    /** Number of messages analyzed */
    messageCount: number;
    /** Number of delimiters found (optional for review-based processors) */
    delimiterCount?: number;
    /** Number of fields extracted */
    fieldCount: number;
    /** Confidence score (0-1, optional for review-based processors) */
    confidence?: number;
  };
}
