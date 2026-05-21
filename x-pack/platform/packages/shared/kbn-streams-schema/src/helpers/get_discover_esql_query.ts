/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql/types';
import type { IngestStreamIndexMode } from '../models/ingest/base';
import { isDraftStream } from '../models/ingest/wired';
import { Streams } from '../models/streams';
import { getIndexPatternsForStream } from './hierarchy_helpers';
import { withUnmappedFieldsDirective } from './esql_helpers';
import { getEsqlViewName } from '../models/query/view_name';

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
  /**
   * Whether to use ES|QL view names for wired streams. Set to false on
   * serverless where the _query/view API is not available. Defaults to false.
   */
  useViews?: boolean;
}

/**
 * Generates a base ES|QL query for Discover from a stream definition.
 *
 * Uses 'TS' source command for TSDB mode streams, 'FROM' otherwise.
 * Optionally includes METADATA _source for wired streams.
 * Results are sorted by @timestamp descending by default for FROM queries.
 * TS (time series) queries do not add explicit sorting as TSDB data is inherently time-ordered.
 *
 * @param options - Configuration options for query generation
 * @returns The ES|QL query string, or undefined if index patterns cannot be determined
 *
 * @example
 * // Basic usage
 * getDiscoverEsqlQuery({ definition, indexMode })
 * // Returns: "FROM logs,logs.* | SORT @timestamp DESC"
 *
 * @example
 * // With TSDB mode (no explicit sort - TSDB is time-ordered)
 * getDiscoverEsqlQuery({ definition, indexMode: 'time_series' })
 * // Returns: "TS logs,logs.*"
 *
 * @example
 * // With metadata for wired streams
 * getDiscoverEsqlQuery({ definition, indexMode, includeMetadata: true })
 * // Returns: "FROM logs,logs.* METADATA _source | SORT @timestamp DESC"
 */
export function getDiscoverEsqlQuery(options: GetDiscoverEsqlQueryOptions): string | undefined {
  const { definition, indexMode, includeMetadata = false, useViews = false } = options;

  if (Streams.QueryStream.Definition.is(definition)) {
    // Query streams use their $.prefixed ES|QL view name directly (e.g. FROM $.cars.electric)
    // rather than data stream index patterns. This is how users access query stream data —
    // parent ingest stream patterns (e.g. FROM cars, cars.*) intentionally exclude them.
    return `FROM ${definition.query.view} | SORT @timestamp DESC`;
  }

  if (useViews && Streams.WiredStream.Definition.is(definition)) {
    const metadataSuffix = includeMetadata ? ' METADATA _source' : '';
    const isDraft = isDraftStream(definition);

    if (isDraft) {
      // Draft views may reference fields that are unmapped across some backing
      // indices. SET unmapped_fields="LOAD" loads those as keyword instead of
      // raising "Unknown column" errors. Partially mapped non-keyword fields
      // are handled by explicit casts in the view definition itself.
      const viewName = getEsqlViewName(definition.name);

      const fromArgs: ESQLAstItem[] = [Builder.expression.source.index(viewName)];
      if (includeMetadata) {
        fromArgs.push(
          Builder.option({
            name: 'METADATA',
            args: [Builder.expression.column({ args: [Builder.identifier({ name: '_source' })] })],
          })
        );
      }

      const commands = [
        Builder.command({ name: 'from', args: fromArgs }),
        Builder.command({
          name: 'sort',
          args: [
            Builder.expression.order(Builder.expression.column('@timestamp'), {
              order: 'DESC',
              nulls: '',
            }),
          ],
        }),
      ];

      const query = BasicPrettyPrinter.multiline(Builder.expression.query(commands), {
        pipeTab: '',
      });

      return withUnmappedFieldsDirective(query);
    }

    return `FROM ${getEsqlViewName(definition.name)}${metadataSuffix} | SORT @timestamp DESC`;
  }

  const indexPatterns = getIndexPatternsForStream(definition);
  if (!indexPatterns) {
    return undefined;
  }

  const sourceCommand = indexMode === 'time_series' ? 'TS' : 'FROM';
  const metadataSuffix = includeMetadata ? ' METADATA _source' : '';
  const sortSuffix = indexMode === 'time_series' ? '' : ' | SORT @timestamp DESC';

  return `${sourceCommand} ${indexPatterns.join(', ')}${metadataSuffix}${sortSuffix}`;
}
