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
import type { IHttpFetchError } from '@kbn/core-http-browser';

import type { ActionType } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { GenerativeAIForSecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import * as i18n from '../translations';

/**
 * Cache expiration in ms -- 1 minute, useful if connector is deleted/access removed
 */
const STALE_TIME = 1000 * 60;
export const QUERY_KEY = ['elastic-assistant, load-action-types'];

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
      const sortedData = queryResult.sort((a, b) => a.name.localeCompare(b.name));

      return sortedData;
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
              title: i18n.LOAD_ACTIONS_ERROR_MESSAGE,
            }
          );
        }
      },
    }
  );
};
