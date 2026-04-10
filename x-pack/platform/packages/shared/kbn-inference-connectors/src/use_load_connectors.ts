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
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { i18n } from '@kbn/i18n';
import { fetchConnectorById } from './fetch_connector_by_id';
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
  settings: SettingsStart;
}

export type UseLoadConnectorsResult = UseQueryResult<AIConnector[], IHttpFetchError> & {
  soEntryFound: boolean;
};

export const useLoadConnectors = ({
  http,
  toasts,
  featureId,
  settings,
}: UseLoadConnectorsProps): UseLoadConnectorsResult => {
  const [soEntryFound, setSoEntryFound] = useState(false);
  const query = useQuery(
    [...QUERY_KEY, featureId],
    async () => {
      const defaultConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
      const defaultConnectorOnly = settings.client.get<boolean>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
        false
      );

      if (defaultConnectorOnly) {
        if (!defaultConnectorId) {
          return [];
        }
        const connector = await fetchConnectorById(http, defaultConnectorId);
        if (connector) {
          return [connector];
        } else {
          return [];
        }
      }

      const result = await fetchConnectorsForFeature(http, featureId);
      setSoEntryFound(result.soEntryFound);
      const aiConnectors = result.connectors.map(toAIConnector);

      if (!result.soEntryFound && defaultConnectorId) {
        const defaultConnector = await fetchConnectorById(http, defaultConnectorId);
        if (defaultConnector) {
          return [defaultConnector, ...aiConnectors.filter((c) => c.id !== defaultConnectorId)];
        }
      }

      return aiConnectors;
    },
    {
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
    }
  );

  return { ...query, soEntryFound };
};
