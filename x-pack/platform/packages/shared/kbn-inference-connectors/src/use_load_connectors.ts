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
import type { InferenceConnector } from '@kbn/inference-common';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { i18n } from '@kbn/i18n';
import { fetchConnectorsForFeature } from './fetch_connectors_for_feature';
import { isOpenAiProviderType } from './openai_provider_type_guard';
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

type InferenceConnectorFromApi = InferenceConnector & { isRecommended?: boolean };

const toAIConnector = (connector: InferenceConnectorFromApi): AIConnector => ({
  id: connector.connectorId,
  name: connector.name,
  actionTypeId: connector.type,
  config: connector.config,
  secrets: {},
  isPreconfigured: connector.isPreconfigured,
  isSystemAction: false,
  isDeprecated: connector.isDeprecated ?? false,
  isConnectorTypeDeprecated: connector.isConnectorTypeDeprecated ?? false,
  isMissingSecrets: connector.isMissingSecrets ?? false,
  isRecommended: connector.isRecommended,
  apiProvider:
    !connector.isPreconfigured &&
    connector.config?.apiProvider !== undefined &&
    isOpenAiProviderType(connector.config.apiProvider)
      ? connector.config.apiProvider
      : undefined,
});

const applyConnectorSettings = <T extends { id: string }>(
  allConnectors: T[],
  settings: SettingsStart
): T[] => {
  const defaultConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultConnectorOnly = settings.client.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  if (defaultConnectorOnly && defaultConnectorId) {
    const connector = allConnectors.find((c) => c.id === defaultConnectorId);
    return connector ? [connector] : allConnectors;
  }
  return allConnectors;
};

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
      const result = await fetchConnectorsForFeature(http, featureId);
      setSoEntryFound(result.soEntryFound);
      return applyConnectorSettings(result.connectors.map(toAIConnector), settings);
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
                defaultMessage: 'Error loading connectors',
              }),
            }
          );
        }
      },
    }
  );

  return { ...query, soEntryFound };
};
