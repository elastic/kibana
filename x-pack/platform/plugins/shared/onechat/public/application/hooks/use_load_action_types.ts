/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ServerError } from '@kbn/cases-plugin/public/types';
import { loadActionTypes } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { ActionType } from '@kbn/actions-plugin/common';
import type { IToasts } from '@kbn/core-notifications-browser';
import { GenerativeAIForSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';

/**
 * Cache expiration in ms -- 1 minute, useful if connector is deleted/access removed
 */
const STALE_TIME = 1000 * 60;
export const QUERY_KEY = ['onechat', 'load-action-types'];

const LOAD_ACTIONS_ERROR_MESSAGE = i18n.translate(
  'xpack.onechat.connectors.useLoadActionTypes.errorMessage',
  {
    defaultMessage: 'An error occurred loading the Kibana Actions.',
  }
);

export interface Props {
  http: HttpSetup;
  toasts?: IToasts;
}

export const useLoadActionTypes = ({
  http,
  toasts,
}: Props): UseQueryResult<ActionType[], IHttpFetchError> => {
  return useQuery(
    QUERY_KEY,
    async () => {
      const queryResult = await loadActionTypes({
        http,
        featureId: GenerativeAIForSecurityConnectorFeatureId,
      });

      // Include all AI-related action types
      const actionTypes = ['.bedrock', '.gen-ai', '.gemini', '.inference'];

      return queryResult
        .filter((p) => actionTypes.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    {
      retry: false,
      keepPreviousData: true,
      staleTime: STALE_TIME,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: LOAD_ACTIONS_ERROR_MESSAGE,
            }
          );
        }
      },
    }
  );
};
