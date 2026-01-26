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
    index,
  }: {
    id: string;
    data: DataPublicPluginStart;
    logSourcesService: LogSourcesService;
    index?: string;
  },
  signal: AbortSignal
): Promise<
  | {
      _index: string;
      fields: Record<PropertyKey, any> | undefined;
    }
  | undefined
> => {
  const queryIndex =
    index ??
    (await logSourcesService
      .getLogSources()
      .then((logSources) =>
        logSources.map((source: { indexPattern: string }) => source.indexPattern).join(',')
      ));

  const result = await lastValueFrom(
    data.search.search(
      {
        params: {
          index: queryIndex,
          size: 1,
          body: {
            timeout: '20s',
            fields: [
              {
                field: '*',
                include_unmapped: true,
              },
            ],
            query: { term: { _id: id } },
          },
        },
      },
      { abortSignal: signal }
    )
  );

  const hit = result.rawResponse.hits.hits[0];

  if (!hit) {
    return undefined;
  }

  return {
    _index: hit._index,
    fields: hit.fields,
  };
};
