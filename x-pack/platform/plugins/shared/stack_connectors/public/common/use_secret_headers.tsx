/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import { useQuery } from '@tanstack/react-query';

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';

interface SecretHeader {
  key: string;
  value: string;
  type: 'secret';
}
type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useSecretHeaders(connectorId?: string) {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const query = useQuery<SecretHeader[], ServerError>(
    ['secretHeaders', connectorId], // queryKey
    async () => {
      // query fn
      const response = await http.get<string[]>(
        `/internal/stack_connectors/${connectorId}/secret_headers`
      );

      return response.map((key) => ({
        key,
        value: '',
        type: 'secret' as const,
      }));
    },
    {
      enabled: Boolean(connectorId),
      refetchOnMount: 'always',
      onError: (error: ServerError) => {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: 'error fetching secret headers',
        });
      },
    }
  );

  return query.data || [];
}
export type UseSecretHeaders = ReturnType<typeof useSecretHeaders>;
