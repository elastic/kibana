/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MappingSuggestionEngine } from './mapping_suggestion_engine';

// Re-export serializable contract types from schema package
export type {
  MappingSuggestionStatus,
  MappingSuggestionSkipReason,
  MappingSuggestionTypeSource,
  MappingSuggestionFieldResult,
  MappingSuggestionStats,
  MappingSuggestionResult,
  MappingSuggestionParams,
} from '@kbn/streams-schema';

// Export server-specific types
export type { MappingSuggestionConfig, FieldCandidate, FieldOccurrence } from './types';

// Backward compatibility aliases
export type { SkipReason, TypeSource } from './types';
