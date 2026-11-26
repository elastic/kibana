/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { QueryClient } from '@kbn/react-query';
import type { ServiceAccountPickerStatus } from '@kbn/security-plugin/public';
import type { ServiceAccountLookupResult } from '../../../../common/lib/validate_service_account_reference';

export interface WorkflowServiceAccount {
  id: string;
  name: string;
  description?: string;
  roles: string[];
  enabled: boolean;
  assumable: boolean;
}

export interface ServiceAccountPage {
  serviceAccounts: WorkflowServiceAccount[];
  nextPage?: string;
}

export interface ServiceAccountDirectoryError {
  error: Exclude<ServiceAccountPickerStatus, 'loading' | 'ready'>;
}

export const serviceAccountQueryOptions = (http: HttpStart, id: string) => ({
  queryKey: ['workflows', 'serviceAccounts', 'account', id],
  queryFn: async (): Promise<ServiceAccountLookupResult<WorkflowServiceAccount>> => {
    try {
      const account = await http.get<WorkflowServiceAccount>(
        `/internal/security/service_account/${encodeURIComponent(id)}`
      );
      return { status: 'found', account };
    } catch (error) {
      // Only a 404 proves the account is missing: executors need not have manage_security.
      return isHttpFetchError(error) && error.response?.status === 404
        ? { status: 'not_found' }
        : { status: 'unknown' };
    }
  },
  retry: false,
  staleTime: 30_000,
  cacheTime: 60_000,
});

export const createServiceAccountDirectory = (
  http: HttpStart,
  queryClient: QueryClient,
  isEnabled: () => boolean
) => {
  /** Resolves an ID; `unknown` when the directory is off or unreadable. */
  const lookup = async (id: string): Promise<ServiceAccountLookupResult<WorkflowServiceAccount>> =>
    isEnabled() && id
      ? queryClient.fetchQuery(serviceAccountQueryOptions(http, id))
      : { status: 'unknown' };

  return {
    isEnabled,
    lookup,
    get: async (id: string): Promise<WorkflowServiceAccount | null> => {
      const result = await lookup(id);
      return result.status === 'found' ? result.account : null;
    },
    list: async (
      after?: string,
      refresh = false
    ): Promise<ServiceAccountPage | ServiceAccountDirectoryError | null> => {
      if (!isEnabled()) return null;
      try {
        // Failures are thrown rather than returned so that the query cache never stores them.
        return await queryClient.fetchQuery({
          queryKey: ['workflows', 'serviceAccounts', 'page', after],
          queryFn: () =>
            http.get<ServiceAccountPage>('/internal/security/service_account', {
              query: { limit: 100, ...(after ? { after } : {}) },
            }),
          retry: false,
          staleTime: refresh ? 0 : 30_000,
          cacheTime: 60_000,
        });
      } catch (error) {
        return {
          error:
            isHttpFetchError(error) && error.response?.status === 403 ? 'forbidden' : 'unavailable',
        };
      }
    },
  };
};

export type ServiceAccountDirectory = ReturnType<typeof createServiceAccountDirectory>;
