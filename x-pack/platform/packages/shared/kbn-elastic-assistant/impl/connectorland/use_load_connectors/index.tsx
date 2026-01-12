/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect } from 'react';
import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { ServerError } from '@kbn/cases-plugin/public/types';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { OpenAiProviderType } from '@kbn/connector-schemas/openai';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { isSupportedConnector } from '@kbn/inference-common';
import { getAvailableAiConnectors } from '@kbn/elastic-assistant-common/impl/connectors/get_available_connectors';
import type { AIConnector } from '../connector_selector';
import * as i18n from '../translations';
/**
 * Cache expiration in ms -- 1 minute, useful if connector is deleted/access removed
 */
// const STALE_TIME = 1000 * 60;
const QUERY_KEY = ['elastic-assistant, load-connectors'];

export interface Props {
  http: HttpSetup;
  toasts?: IToasts;
  inferenceEnabled?: boolean;
  settings: SettingsStart;
}

const actionTypes = ['.bedrock', '.gen-ai', '.gemini'];

export const useLoadConnectors = ({
  http,
  toasts,
  inferenceEnabled = false,
  settings,
}: Props): UseQueryResult<AIConnector[], IHttpFetchError> => {
  useEffect(() => {
    if (inferenceEnabled && !actionTypes.includes('.inference')) {
      actionTypes.push('.inference');
    }
  }, [inferenceEnabled]);

  return useQuery(
    QUERY_KEY,
    async () => {
      const connectors = await loadConnectors({ http });

      const allAiConnectors = connectors.flatMap((connector) => {
        if (
          !connector.isMissingSecrets &&
          actionTypes.includes(connector.actionTypeId) &&
          isSupportedConnector(connector)
        ) {
          const aiConnector: AIConnector = {
            ...connector,
            apiProvider:
              !connector.isPreconfigured &&
              !connector.isSystemAction &&
              connector?.config?.apiProvider
                ? (connector?.config?.apiProvider as OpenAiProviderType)
                : undefined,
          };
          return [aiConnector];
        }
        return [];
      });

      return getAvailableAiConnectors({
        allAiConnectors,
        settings,
      });
    },
    {
      retry: false,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.LOAD_CONNECTORS_ERROR_MESSAGE,
            }
          );
        }
      },
    }
  );
};
