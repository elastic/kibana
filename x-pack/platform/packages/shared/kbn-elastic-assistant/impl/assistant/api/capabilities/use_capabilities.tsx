/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { HttpSetup, IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import type { GetCapabilitiesResponse } from '@kbn/elastic-assistant-common';
import { getCapabilities } from './capabilities';

const CAPABILITIES_QUERY_KEY = ['elastic-assistant', 'capabilities'];

export interface UseCapabilitiesParams {
  http: HttpSetup;
  toasts?: IToasts;
}
/**
 * Hook for getting the feature capabilities of the assistant
 *
 * @param {Object} options - The options object.
 * @param {HttpSetup} options.http - HttpSetup
 * @param {IToasts} options.toasts - IToasts
 *
 * @returns {useQuery} hook for getting the status of the Knowledge Base
 */
export const useCapabilities = ({
  http,
  toasts,
}: UseCapabilitiesParams): UseQueryResult<GetCapabilitiesResponse, IHttpFetchError> => {
  return useQuery({
    queryKey: CAPABILITIES_QUERY_KEY,
    queryFn: async ({ signal }) => {
      return getCapabilities({ http, signal });
    },
    retry: false,
    keepPreviousData: true,
    // Deprecated, hoist to `queryCache` w/in `QueryClient. See: https://stackoverflow.com/a/76961109
    onError: (error: IHttpFetchError<ResponseErrorBody>) => {
      if (error.name !== 'AbortError') {
        toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
          title: i18n.translate('xpack.elasticAssistant.capabilities.statusError', {
            defaultMessage: 'Error fetching capabilities',
          }),
        });
      }
    },
  });
};
