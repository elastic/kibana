/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getEsqlColumnSchema } from './get_esql_column_schema';

export interface MappingConflict {
  field: string;
  types: string[];
  suggestedCast?: string;
}

export interface GetMappingConflictsParams {
  esClient: ElasticsearchClient | TracedElasticsearchClient;
  index: string | string[];
  signal?: AbortSignal;
}

/**
 * Detects fields mapped as multiple incompatible types across a source (ES|QL union types), probing
 * unfiltered so a conflict isolated in an older backing index is still seen.
 */
export async function getMappingConflicts({
  esClient,
  index,
  signal,
}: GetMappingConflictsParams): Promise<MappingConflict[]> {
  const columns = await getEsqlColumnSchema({ esClient, index, signal });

  return columns.flatMap((column) => {
    const originalTypes = column.originalTypes;
    if (!originalTypes || originalTypes.length <= 1) {
      return [];
    }

    return [
      {
        field: column.name,
        types: [...originalTypes].sort(),
        ...(column.suggestedCast ? { suggestedCast: column.suggestedCast } : {}),
      },
    ];
  });
}
