/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Streams, RawDashboard } from '@kbn/streams-schema';
import { getEsqlViewName } from '@kbn/streams-schema';
import type { DashboardSuggestionInput } from './types';

/**
 * Options for preparing dashboard suggestion input.
 */
export interface PrepareDashboardSuggestionInputOptions {
  /** The stream definition (ingest or query) */
  definition: Streams.all.Definition;
  /** Identified features for the stream */
  features: Feature[];
  /** For query streams: the ES|QL query from the view (must be provided externally) */
  esqlQuery?: string;
  /** Optional guidance text to direct the suggestion */
  guidance?: string;
  /** Optional previous dashboard for refinement */
  previousDashboard?: RawDashboard;
}

/**
 * Determines the input type based on the stream definition.
 */
export function getInputTypeFromDefinition(definition: Streams.all.Definition): 'ingest' | 'query' {
  // Query streams have a 'query' property with 'view'
  if ('query' in definition && definition.query && 'view' in definition.query) {
    return 'query';
  }
  return 'ingest';
}

/**
 * Prepares a DashboardSuggestionInput from a stream definition.
 *
 * This function handles both ingest and query streams:
 * - For ingest streams: Uses the stream definition directly
 * - For query streams: Uses the provided ES|QL query from the view
 *
 * Note: For query streams, the caller must provide the ES|QL query
 * fetched from the ES|QL view, as this is not stored in the definition.
 *
 * @param options - Options for preparing the input
 * @returns A DashboardSuggestionInput ready for the suggestion engine
 * @throws Error if query stream is provided without esqlQuery
 */
export function prepareDashboardSuggestionInput(
  options: PrepareDashboardSuggestionInputOptions
): DashboardSuggestionInput {
  const { definition, features, esqlQuery, guidance, previousDashboard } = options;

  const inputType = getInputTypeFromDefinition(definition);

  if (inputType === 'query') {
    // Query streams require the ES|QL query to be provided
    if (!esqlQuery) {
      throw new Error(
        `Query stream "${definition.name}" requires esqlQuery to be provided. ` +
          `Fetch the query from the ES|QL view before calling this function.`
      );
    }

    // Get the ES|QL view name for the stream
    const esqlViewName = getEsqlViewName(definition.name);

    return {
      streamName: definition.name,
      inputType: 'query',
      esqlQuery,
      esqlViewName,
      features,
      guidance,
      previousDashboard,
    };
  }

  // Ingest streams use the definition directly
  return {
    streamName: definition.name,
    inputType: 'ingest',
    definition: definition as Streams.ingest.all.Definition,
    features,
    guidance,
    previousDashboard,
  };
}

/**
 * Type guard to check if a definition is a query stream definition.
 */
export function isQueryStreamDefinition(
  definition: Streams.all.Definition
): definition is Streams.QueryStream.Definition {
  return 'query' in definition && definition.query !== undefined && 'view' in definition.query;
}

/**
 * Type guard to check if a definition is an ingest stream definition.
 */
export function isIngestStreamDefinition(
  definition: Streams.all.Definition
): definition is Streams.ingest.all.Definition {
  return !isQueryStreamDefinition(definition);
}
