/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { SignificantEventsPreviewResponse, Streams } from '@kbn/streams-schema';
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import type { ESQLSearchResponse } from '@kbn/es-types';

interface OccurrenceBucket {
  date: string;
  count: number;
}

/**
 * Builds an ES|QL query to get date histogram occurrences for a given WHERE condition.
 */
function buildOccurrencesQuery({
  indices,
  esqlWhere,
  from,
  to,
  bucketSize,
}: {
  indices: string[];
  esqlWhere: string;
  from: Date;
  to: Date;
  bucketSize: string;
}): string {
  const indexPattern = indices.join(',');
  const timeFilter = `@timestamp >= "${from.toISOString()}" AND @timestamp <= "${to.toISOString()}"`;
  const combinedWhere = esqlWhere ? `(${esqlWhere}) AND ${timeFilter}` : timeFilter;

  return `FROM ${indexPattern}
| WHERE ${combinedWhere}
| STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, ${bucketSize})
| SORT bucket ASC`;
}

export async function previewSignificantEvents(
  params: {
    definition: Streams.all.Definition;
    esqlWhere: string;
    from: Date;
    to: Date;
    bucketSize: string;
  },
  dependencies: {
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsPreviewResponse> {
  const { bucketSize, from, to, definition, esqlWhere } = params;
  const { scopedClusterClient } = dependencies;
  const indices = getIndexPatternsForStream(definition);

  const query = buildOccurrencesQuery({
    indices,
    esqlWhere,
    from,
    to,
    bucketSize,
  });

  try {
    const response = (await scopedClusterClient.asCurrentUser.esql.query({
      query,
      drop_null_columns: true,
    })) as unknown as ESQLSearchResponse;

    const bucketColIndex = response.columns.findIndex((col) => col.name === 'bucket');
    const countColIndex = response.columns.findIndex((col) => col.name === 'count');

    if (bucketColIndex === -1 || countColIndex === -1) {
      return {
        esql: { where: esqlWhere },
        change_points: { type: {} },
        occurrences: [],
      };
    }

    const occurrences: OccurrenceBucket[] = response.values.map((row) => ({
      date: row[bucketColIndex] as string,
      count: Number(row[countColIndex]),
    }));

    // TODO: Implement change points detection
    return {
      esql: { where: esqlWhere },
      change_points: { type: {} },
      occurrences,
    };
  } catch {
    return {
      esql: { where: esqlWhere },
      change_points: { type: {} },
      occurrences: [],
    };
  }
}
