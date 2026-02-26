/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSampleProbability } from '@kbn/ml-random-sampler-utils';
import type { ISearchGeneric } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';
import { fromPromise } from 'xstate';
import type { LogCategorizationParams } from './types';
import { createCategorizationQuery } from './queries';

export const countDocuments = ({ search }: { search: ISearchGeneric }) =>
  fromPromise<
    {
      documentCount: number;
      samplingProbability: number;
    },
    LogCategorizationParams
  >(
    async ({
      input: { index, endTimestamp, startTimestamp, timeField, messageField, documentFilters },
      signal,
    }) => {
      const { rawResponse: totalHitsResponse } = await lastValueFrom(
        search(
          {
            params: {
              index,
              size: 0,
              track_total_hits: true,
              query: createCategorizationQuery({
                messageField,
                timeField,
                startTimestamp,
                endTimestamp,
                additionalFilters: documentFilters,
              }),
            },
          },
          { abortSignal: signal }
        )
      );

      const documentCount =
        totalHitsResponse.hits.total == null
          ? 0
          : typeof totalHitsResponse.hits.total === 'number'
          ? totalHitsResponse.hits.total
          : totalHitsResponse.hits.total.value;
      const samplingProbability = getSampleProbability(documentCount);

      return {
        documentCount,
        samplingProbability,
      };
    }
  );
