/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchGeneric } from '@kbn/search-types';
import { fromPromise } from 'xstate5';
import { lastValueFrom } from 'rxjs';
import { flattenHit } from '@kbn/data-service';
import { LogCategoryDocument, LogCategoryDocumentsParams } from './types';
import { createGetLogCategoryDocumentsRequestParams } from './queries';

export const getCategoryDocuments = ({ search }: { search: ISearchGeneric }) =>
  fromPromise<
    {
      categoryDocuments: LogCategoryDocument[];
    },
    LogCategoryDocumentsParams
  >(
    async ({
      input: {
        index,
        endTimestamp,
        startTimestamp,
        timeField,
        messageField,
        categoryTerms,
        additionalFilters = [],
        dataView,
      },
      signal,
    }) => {
      const requestParams = createGetLogCategoryDocumentsRequestParams({
        index,
        timeField,
        messageField,
        startTimestamp,
        endTimestamp,
        additionalFilters,
        categoryTerms,
      });

      const { rawResponse } = await lastValueFrom(
        search({ params: requestParams }, { abortSignal: signal })
      );

      const categoryDocuments: LogCategoryDocument[] =
        rawResponse.hits?.hits.map((hit) => {
          return {
            row: {
              raw: hit._source,
              flattened: flattenHit(hit, dataView),
            },
          };
        }) ?? [];

      return {
        categoryDocuments,
      };
    }
  );
