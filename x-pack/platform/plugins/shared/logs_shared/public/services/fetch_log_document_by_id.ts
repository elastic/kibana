/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';

export const fetchLogDocumentById = async (
  {
    id,
    data,
    logSourcesService,
  }: {
    id: string;
    data: DataPublicPluginStart;
    logSourcesService: LogSourcesService;
  },
  signal: AbortSignal
): Promise<{
  _index: string | null;
  fields: Record<PropertyKey, any> | null;
}> => {
  // Get log indices directly from advanced settings (log sources)
  const logSources = await logSourcesService.getLogSources();
  const indexPattern = logSources
    .map((source: { indexPattern: string }) => source.indexPattern)
    .join(',');

  const result = await lastValueFrom(
    data.search.search(
      {
        params: {
          index: indexPattern,
          size: 1,
          body: {
            timeout: '20s',
            fields: [
              {
                field: '*',
                include_unmapped: true,
              },
            ],
            query: {
              term: {
                _id: id,
              },
            },
          },
        },
      },
      { abortSignal: signal }
    )
  );

  const hit = result.rawResponse.hits.hits[0];

  return {
    _index: hit?._index ?? null,
    fields: hit?.fields ?? null,
  };
};
