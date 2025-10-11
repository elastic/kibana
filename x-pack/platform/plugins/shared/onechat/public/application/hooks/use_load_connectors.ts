/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ServerError } from '@kbn/cases-plugin/public/types';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import type { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { i18n } from '@kbn/i18n';
import type { AIConnector } from '../components/settings/connector_selector';

/**
 * Cache expiration in ms -- 1 minute, useful if connector is deleted/access removed
 */
// const STALE_TIME = 1000 * 60;
const QUERY_KEY = ['onechat', 'load-connectors'];

export interface Props {
  http: HttpSetup;
  toasts?: IToasts;
}

const actionTypes = ['.bedrock', '.gen-ai', '.gemini', '.inference'];

const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.onechat.connectors.useLoadConnectors.errorMessage',
  {
    defaultMessage: 'An error occurred loading the Kibana Connectors.',
  }
);

export const useLoadConnectors = ({
  http,
  toasts,
}: Props): UseQueryResult<AIConnector[], IHttpFetchError> => {
  return useQuery(
    QUERY_KEY,
    async () => {
      const connectors = await loadConnectors({ http });
      return connectors.reduce((acc: AIConnector[], connector) => {
        if (!connector.isMissingSecrets && actionTypes.includes(connector.actionTypeId)) {
          acc.push({
            ...connector,
            apiProvider:
              !connector.isPreconfigured &&
              !connector.isSystemAction &&
              connector?.config?.apiProvider
                ? (connector?.config?.apiProvider as OpenAiProviderType)
                : undefined,
          });
        }
        return acc;
      }, []);
    },
    {
      retry: false,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: LOAD_CONNECTORS_ERROR_MESSAGE,
            }
          );
        }
      },
    }
  );
};
