/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';
import { toAIConnector } from './load_connectors';
import type { AIConnector } from './types';

const QUERY_KEY = ['kbn-inference-connectors', 'load-connectors'];

/**
 * Props for {@link useLoadConnectors}.
 *
 * The hook calls an internal HTTP route registered by the `searchInferenceEndpoints` plugin.
 * Any Kibana plugin that uses this package must load that plugin (it is platform-shared and
 * enabled in standard distributions).
 */
export interface UseLoadConnectorsProps {
  http: HttpSetup;
  toasts?: IToasts;
  /**
   * Feature identifier used to scope which inference endpoints are relevant.
   * Passed to the search_inference_endpoints API to resolve feature-specific endpoints.
   */
  featureId: string;
  /**
   * @deprecated No longer read by the hook. Default-connector UI settings are now applied
   * server-side by the search_inference_endpoints connectors route. Kept for call-site
   * compatibility and will be removed in a follow-up.
   */
  settings?: SettingsStart;
}

export type UseLoadConnectorsResult = UseQueryResult<AIConnector[], IHttpFetchError> & {
  soEntryFound: boolean;
};

export const useLoadConnectors = ({
  http,
  toasts,
  featureId,
}: UseLoadConnectorsProps): UseLoadConnectorsResult => {
  const [soEntryFound, setSoEntryFound] = useState(false);
  const query = useQuery({
    queryKey: [...QUERY_KEY, featureId],
    queryFn: async () => {
      const result = await fetchConnectorsForFeature(http, featureId);
      setSoEntryFound(result.soEntryFound);
      return result.connectors.map(toAIConnector);
    },
    retry: false,
    keepPreviousData: true,
    onError: (error: IHttpFetchError) => {
      if (error.name !== 'AbortError') {
        toasts?.addError(
          error.body && (error.body as { message?: string }).message
            ? new Error((error.body as { message: string }).message)
            : error,
          {
            title: i18n.translate('inferenceConnectors.useLoadConnectors.errorMessage', {
              defaultMessage: 'Error loading models',
            }),
          }
        );
      }
    },
  });

  return { ...query, soEntryFound };
};
