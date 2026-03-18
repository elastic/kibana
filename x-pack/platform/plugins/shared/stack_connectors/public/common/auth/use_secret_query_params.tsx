/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useQuery, type UseQueryOptions } from '@kbn/react-query';

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useSecretQueryParams(
  connectorId?: string,
  queryOptions?: UseQueryOptions<string[], ServerError>
) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery<string[], ServerError>(
    ['secretQueryParams', connectorId],
    async () => {
      return await http.get<string[]>(
        `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/${connectorId}/secret_query_params`
      );
    },
    {
      enabled: Boolean(connectorId),
      initialData: [],
      refetchOnMount: true,
      onError: (error: ServerError) => {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: i18n.translate(
            'xpack.stackConnectors.public.common.errorFetchingSecretQueryParams',
            {
              defaultMessage: 'Error fetching secret query parameters',
            }
          ),
        });
      },
      ...queryOptions,
    }
  );
}
export type UseSecretQueryParams = ReturnType<typeof useSecretQueryParams>;
