/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { getDatasets } from './datasets';

const DATASETS_QUERY_KEY = ['elastic-assistant', 'datasets'];

export interface UseEvaluationDataParams {
  http: HttpSetup;
  toasts?: IToasts;
}

/**
 * Hook for fetching datasets
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} [options.toasts] - IToasts
 *
 * @returns {useMutation} mutation hook for setting up the Knowledge Base
 */
export const useDatasets = ({ http, toasts }: UseEvaluationDataParams) => {
  return useQuery({
    queryKey: DATASETS_QUERY_KEY,
    queryFn: ({ signal }) => {
      // Optional params workaround: see: https://github.com/TanStack/query/issues/1077#issuecomment-1431247266
      return getDatasets({ http, signal });
    },
    retry: false,
    keepPreviousData: true,
    // Deprecated, hoist to `queryCache` w/in `QueryClient. See: https://stackoverflow.com/a/76961109
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      if (error.name !== 'AbortError') {
        toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.translate('xpack.elasticAssistant.datasets.fetchDatasetsError', {
            defaultMessage: 'Error fetching datasets...',
          }),
        });
      }
    },
  });
};
