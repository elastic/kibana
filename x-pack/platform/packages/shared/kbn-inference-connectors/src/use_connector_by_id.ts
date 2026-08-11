/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { IHttpFetchError, HttpSetup } from '@kbn/core-http-browser';
import type { IToasts } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import { fetchConnectorById } from './fetch_connector_by_id';
import type { AIConnector } from './types';

const QUERY_KEY = ['kbn-inference-connectors', 'connector-by-id'];

export interface UseConnectorByIdProps {
  http: HttpSetup;
  connectorId: string | undefined;
  toasts?: IToasts;
}

export type UseConnectorByIdResult = UseQueryResult<AIConnector | undefined, IHttpFetchError>;

export const useConnectorById = ({
  http,
  connectorId,
  toasts,
}: UseConnectorByIdProps): UseConnectorByIdResult => {
  return useQuery([...QUERY_KEY, connectorId], () => fetchConnectorById(http, connectorId!), {
    enabled: !!connectorId,
    retry: false,
    keepPreviousData: true,
    onError: (error: IHttpFetchError) => {
      if (error.name !== 'AbortError') {
        toasts?.addError(
          error.body && (error.body as { message?: string }).message
            ? new Error((error.body as { message: string }).message)
            : error,
          {
            title: i18n.translate('inferenceConnectors.useConnectorById.errorMessage', {
              defaultMessage: 'Error loading connector',
            }),
          }
        );
      }
    },
  });
};
