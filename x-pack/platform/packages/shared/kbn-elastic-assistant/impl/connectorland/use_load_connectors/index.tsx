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
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { HttpSetup } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { useAssistantContext } from '../../assistant_context';
import { AIConnector } from '../connector_selector';
import * as i18n from '../translations';

/**
 * Cache expiration in ms -- 1 minute, useful if connector is deleted/access removed
 */
// const STALE_TIME = 1000 * 60;
const QUERY_KEY = ['elastic-assistant, load-connectors'];

export interface Props {
  http: HttpSetup;
  toasts?: IToasts;
}

const actionTypes = ['.bedrock', '.gen-ai', '.gemini'];

export const useLoadConnectors = ({
  http,
  toasts,
}: Props): UseQueryResult<AIConnector[], IHttpFetchError> => {
  const { inferenceEnabled } = useAssistantContext();
  if (inferenceEnabled) {
    actionTypes.push('.inference');
  }

  return useQuery(
    QUERY_KEY,
    async () => {
      const queryResult = await loadConnectors({ http });
      return queryResult.reduce(
        (acc: AIConnector[], connector) => [
          ...acc,
          ...(!connector.isMissingSecrets &&
          actionTypes.includes(connector.actionTypeId) &&
          // only include preconfigured .inference connectors
          (connector.actionTypeId !== '.inference' || connector.isPreconfigured)
            ? [
                {
                  ...connector,
                  apiProvider:
                    !connector.isPreconfigured &&
                    !connector.isSystemAction &&
                    connector?.config?.apiProvider
                      ? (connector?.config?.apiProvider as OpenAiProviderType)
                      : undefined,
                },
              ]
            : []),
        ],
        []
      );
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
