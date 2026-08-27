/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { useQuery, type UseQueryOptions } from '@kbn/react-query';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';

type ServerError = IHttpFetchError<ResponseErrorBody>;
type SecretKeysKind = 'params' | 'queryParams';

const secretKeysConfig = {
  params: {
    queryKey: 'secretParams',
    path: 'secret_params',
    errorTitle: i18n.translate('xpack.stackConnectors.public.common.errorFetchingSecretParams', {
      defaultMessage: 'Error fetching secret parameters',
    }),
  },
  queryParams: {
    queryKey: 'secretQueryParams',
    path: 'secret_query_params',
    errorTitle: i18n.translate(
      'xpack.stackConnectors.public.common.errorFetchingSecretQueryParams',
      { defaultMessage: 'Error fetching secret query parameters' }
    ),
  },
} as const;

const useSecretKeys = (
  kind: SecretKeysKind,
  connectorId?: string,
  isEdit: boolean = false,
  queryOptions?: UseQueryOptions<string[], ServerError>
) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const config = secretKeysConfig[kind];

  return useQuery<string[], ServerError>(
    [config.queryKey, connectorId],
    async () =>
      await http.get<string[]>(
        `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/${encodeURIComponent(
          connectorId ?? ''
        )}/${encodeURIComponent(config.path)}`
      ),
    {
      enabled: isEdit && Boolean(connectorId),
      initialData: [],
      refetchOnMount: 'always',
      onError: (error) => {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: config.errorTitle,
        });
      },
      ...queryOptions,
    }
  );
};

export const useSecretParams = (
  connectorId?: string,
  isEdit?: boolean,
  queryOptions?: UseQueryOptions<string[], ServerError>
) => useSecretKeys('params', connectorId, isEdit, queryOptions);

export const useSecretQueryParams = (
  connectorId?: string,
  isEdit?: boolean,
  queryOptions?: UseQueryOptions<string[], ServerError>
) => useSecretKeys('queryParams', connectorId, isEdit, queryOptions);
