/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bulk status response item for suggestions.
 * Used by the streams listing page to show suggestion counts.
 * Includes pipeline suggestions, feature identification, and significant events queries.
 */
export interface SuggestionBulkStatusItem {
  stream: string;
  suggestionCount: number;
  /** Count of completed pipeline/processing suggestions ready to review */
  pipelineCount: number;
  /** Count of pipeline suggestions currently being generated */
  pipelineInProgressCount: number;
  /** Count of pipeline suggestions that failed to generate */
  pipelineFailedCount: number;
  /** ISO timestamp when the pipeline suggestion task was created */
  pipelineCreatedAt?: string;
  /** Count of feature identification/partitioning suggestions */
  featuresCount: number;
  /** Count of significant events suggestions */
  significantEventsCount: number;
}
