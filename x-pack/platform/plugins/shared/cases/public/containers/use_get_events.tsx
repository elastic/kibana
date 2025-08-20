/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { IEsSearchResponse } from '@kbn/search-types';
import { useToasts, KibanaServices } from '../common/lib/kibana';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';

export const useGetEvents = (
  caseId: string,
  pattern: string[],
  columns: string[],
  eventIds: string[]
) => {
  const toasts = useToasts();
  return useQuery(
    casesQueriesKeys.caseEvents(caseId, [...eventIds, ...columns]),
    ({ signal }) => {
      const { data } = KibanaServices.get();

      const observable = data.search.search({
        params: {
          index: pattern,
          body: {
            query: {
              ids: {
                values: eventIds,
              },
            },
          },
          fields: columns,
        },
      });

      return new Promise<IEsSearchResponse>((resolve, reject) => {
        observable.subscribe((results) => {
          if (results.isPartial) {
            return;
          }

          if (signal?.aborted) {
            return reject(new AbortError());
          }

          return resolve(results);
        });
      });
    },
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};
