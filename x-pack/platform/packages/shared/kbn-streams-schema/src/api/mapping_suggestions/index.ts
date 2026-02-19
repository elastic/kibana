/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinitionConfig, FieldDefinitionType } from '../../fields';

/**
 * Status of a mapping suggestion for a field.
 * - 'mapped': Field was successfully mapped with a suggested type
 * - 'skipped': Field was skipped due to one of the SkipReason conditions
 */
export type MappingSuggestionStatus = 'mapped' | 'skipped';

/**
 * Reason why a field was skipped during mapping suggestions.
 * These are deterministic, priority-ordered skip conditions.
 */
export type MappingSuggestionSkipReason =
  | 'low_occurrence_rate' // Field appears in less than threshold% of documents
  | 'no_type_available' // No type could be inferred from metadata or ES field caps
  | 'unsupported_type' // Type is not in FIELD_DEFINITION_TYPES
  | 'system_field' // Field is a system field that cannot be mapped
  | 'existing_mapping_conflict' // Existing user-defined mapping conflicts with suggestion
  | 'existing_mapping_present'; // Field already has a mapping (no conflict, just skip)

/**
 * Source of the suggested field type.
 * Indicates where the type suggestion originated from.
 */
export type MappingSuggestionTypeSource =
  | 'ecs' // From ECS field metadata
  | 'otel' // From OpenTelemetry field metadata
  | 'integration' // From integration field metadata
  | 'es_field_caps' // From Elasticsearch field capabilities
  | 'unknown'; // Source could not be determined

/**
 * Result for a single field in the mapping suggestion process.
 * This is a serializable contract suitable for task payloads.
 */
export interface MappingSuggestionFieldResult {
  /** Field name (dot-notation path) */
  name: string;
  /** Whether the field was mapped or skipped */
  status: MappingSuggestionStatus;
  /** The suggested field type (present when status='mapped') */
  type?: FieldDefinitionType;
  /** Source of the type suggestion */
  source?: MappingSuggestionTypeSource;
  /** Human-readable description of the field (from metadata) */
  description?: string;
  /** Reason why the field was skipped (present when status='skipped') */
  reason?: MappingSuggestionSkipReason;
  /** Occurrence rate of the field in sampled documents (0-1) */
  occurrenceRate?: number;
  /** Additional error message if something unexpected occurred */
  error?: string;
}

/**
 * Aggregate statistics for the mapping suggestion result.
 */
export interface MappingSuggestionStats {
  /** Total number of unique fields detected in samples */
  totalFields: number;
  /** Number of fields that were mapped successfully */
  mappedCount: number;
  /** Number of fields that were skipped */
  skippedCount: number;
  /** Number of fields that had errors during processing */
  errorCount: number;
}

/**
 * Complete result of the mapping suggestion engine.
 * This is the serializable contract for orchestration task payloads.
 *
 * Used as `TPayload` for `TaskResult<MappingSuggestionResult>` in orchestration tasks.
 */
export interface MappingSuggestionResult {
  /** Stream name that was processed */
  streamName: string;
  /** Whether the suggestions were auto-applied to the stream */
  applied: boolean;
  /** Per-field results with status, type, and reason */
  fields: MappingSuggestionFieldResult[];
  /** Aggregate statistics */
  stats: MappingSuggestionStats;
  /** Field mappings that were or can be applied (Record<fieldName, FieldDefinitionConfig>) */
  appliedMappings: Record<string, FieldDefinitionConfig>;
  /** ISO 8601 timestamp when the suggestion was generated */
  timestamp: string;
  /** Error message if auto-apply failed (only present on error) */
  error?: string;
}

/**
 * Configuration options for requesting mapping suggestions.
 * Used as task parameters when invoking the mapping suggestion engine.
 */
export interface MappingSuggestionParams {
  /** Stream name to analyze */
  streamName: string;
  /**
   * Minimum occurrence rate (0-1) for a field to be considered for mapping.
   * Fields appearing in less than this percentage of sampled documents are skipped.
   * @default 0.1 (10%)
   */
  minOccurrenceRate?: number;
  /**
   * Number of documents to sample for field detection.
   * @default 500
   */
  sampleSize?: number;
  /**
   * Time range start (epoch ms) for sampling documents.
   * @default now - 24h
   */
  start?: number;
  /**
   * Time range end (epoch ms) for sampling documents.
   * @default now
   */
  end?: number;
  /**
   * Whether to auto-apply the suggestions to the stream definition.
   * Only applies to draft wired streams.
   * @default false
   */
  autoApply?: boolean;
}
