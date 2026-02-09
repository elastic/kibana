/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamIndexMode } from '../models/ingest/base';
import { Streams } from '../models/streams';
import { getIndexPatternsForStream } from './hierarchy_helpers';

export interface GetDiscoverEsqlQueryOptions {
  /**
   * The stream definition to generate the query for
   */
  definition: Streams.all.Definition;
  /**
   * The index mode of the stream (from API response)
   */
  indexMode?: IngestStreamIndexMode;
  /**
   * Whether to include METADATA _source (typically for wired streams)
   */
  includeMetadata?: boolean;
}

/**
 * Generates a base ES|QL query for Discover from a stream definition.
 *
 * Uses 'TS' source command for TSDB mode streams, 'FROM' otherwise.
 * Optionally includes METADATA _source for wired streams.
 *
 * @param options - Configuration options for query generation
 * @returns The ES|QL query string, or undefined if index patterns cannot be determined
 *
 * @example
 * // Basic usage
 * getDiscoverEsqlQuery({ definition, indexMode })
 * // Returns: "FROM logs,logs.*"
 *
 * @example
 * // With TSDB mode
 * getDiscoverEsqlQuery({ definition, indexMode: 'time_series' })
 * // Returns: "TS logs,logs.*"
 *
 * @example
 * // With metadata for wired streams
 * getDiscoverEsqlQuery({ definition, indexMode, includeMetadata: true })
 * // Returns: "FROM logs,logs.* METADATA _source"
 */
export function getDiscoverEsqlQuery(options: GetDiscoverEsqlQueryOptions): string | undefined {
  const { definition, indexMode, includeMetadata = false } = options;

  if (Streams.QueryStream.Definition.is(definition)) {
    // Use the ES|QL view name as the query source
    return `FROM ${definition.query.view}`;
  }

  const indexPatterns = getIndexPatternsForStream(definition);
  if (!indexPatterns) {
    return undefined;
  }

  const sourceCommand = indexMode === 'time_series' ? 'TS' : 'FROM';
  const metadataSuffix = includeMetadata ? ' METADATA _source' : '';

  return `${sourceCommand} ${indexPatterns.join(', ')}${metadataSuffix}`;
}
