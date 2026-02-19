/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinitionType } from '@kbn/streams-schema/src/fields';
import type { MappingSuggestionTypeSource } from '@kbn/streams-schema';

// Re-export the serializable contract types from the schema package.
// These are the canonical types for orchestration task payloads.
export type {
  MappingSuggestionStatus,
  MappingSuggestionSkipReason,
  MappingSuggestionTypeSource,
  MappingSuggestionFieldResult,
  MappingSuggestionStats,
  MappingSuggestionResult,
  MappingSuggestionParams,
} from '@kbn/streams-schema';

// Type aliases for backward compatibility with existing engine code
export type { MappingSuggestionSkipReason as SkipReason } from '@kbn/streams-schema';
export type { MappingSuggestionTypeSource as TypeSource } from '@kbn/streams-schema';

/**
 * Configuration options for the mapping suggestion engine.
 * This extends MappingSuggestionParams for internal engine use.
 */
export interface MappingSuggestionConfig {
  /**
   * Minimum occurrence rate (0-1) for a field to be considered for mapping.
   * Fields appearing in less than this percentage of sampled documents are skipped.
   * @default 0.1 (10%)
   */
  minOccurrenceRate?: number;
  /**
   * Number of documents to sample for field detection
   * @default 500
   */
  sampleSize?: number;
  /**
   * Time range start (epoch ms) for sampling documents
   */
  start?: number;
  /**
   * Time range end (epoch ms) for sampling documents
   */
  end?: number;
  /**
   * Whether to auto-apply the suggestions to the stream definition
   * @default false
   */
  autoApply?: boolean;
}

/**
 * Field occurrence data collected from sampled documents
 */
export interface FieldOccurrence {
  /** Field name */
  name: string;
  /** Number of documents where this field appears */
  count: number;
  /** Sample values from the field (for potential type inference) */
  sampleValues?: unknown[];
}

/**
 * Internal representation of a field candidate during processing
 */
export interface FieldCandidate {
  name: string;
  occurrenceRate: number;
  existingType?: FieldDefinitionType | 'system';
  suggestedType?: FieldDefinitionType;
  esType?: string;
  source?: MappingSuggestionTypeSource;
  description?: string;
}
