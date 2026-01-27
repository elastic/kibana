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
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../../common';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useSecretHeaders(
  connectorId?: string,
  queryOptions?: UseQueryOptions<string[], ServerError>
) {
  const { http } = useKibana().services;

  return useQuery<string[], ServerError>({
    queryKey: ['secretHeaders', connectorId],
    queryFn: async () => {
      return await http.get<string[]>(
        `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/${connectorId}/secret_headers`
      );
    },
    enabled: Boolean(connectorId),
    initialData: [],
    refetchOnMount: 'always',
    meta: {
      getErrorToast: () => ({
        type: 'error',
        title: i18n.translate('xpack.stackConnectors.public.common.errorFetchingSecretHeaders', {
          defaultMessage: 'Error fetching secret headers',
        }),
      }),
    } satisfies ResponseOpsQueryMeta,
    ...queryOptions,
  });
}
export type UseSecretHeaders = ReturnType<typeof useSecretHeaders>;
