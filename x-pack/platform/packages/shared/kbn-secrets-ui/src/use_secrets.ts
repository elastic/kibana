/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { QueryKey, UseQueryResult } from '@kbn/react-query';
import type {
  SecretConnectorsResponse,
  SecretsListResponse,
  SecretUsageCountsResponse,
  SecretUsageResponse,
} from '@kbn/secrets';
import type { SecretsApi, SecretsHttpError } from './api';

/**
 * Shared by everything that reads or changes the secrets of a consumer, so that a change
 * refreshes them all. The route keeps the secrets of two consumers apart.
 */
export const getSecretsQueryKey = ({ routes }: SecretsApi): QueryKey => ['secrets', routes.secrets];

/** Loads the secrets of a consumer, without their values. */
export const useSecrets = (
  api: SecretsApi
): UseQueryResult<SecretsListResponse, SecretsHttpError> =>
  useQuery<SecretsListResponse, SecretsHttpError>({
    queryKey: getSecretsQueryKey(api),
    queryFn: api.listSecrets,
    retry: false,
    refetchOnWindowFocus: true,
  });

/** Loads the connectors that can hold secrets and that the user may access. */
export const useSecretConnectors = (
  api: SecretsApi
): UseQueryResult<SecretConnectorsResponse, SecretsHttpError> =>
  useQuery<SecretConnectorsResponse, SecretsHttpError>({
    queryKey: ['secretConnectors', api.routes.secretConnectors],
    queryFn: api.listSecretConnectors,
    retry: false,
  });

const NO_SECRETS_USAGE: SecretUsageCountsResponse = { counts: {} };

const NO_SECRET_USAGE: SecretUsageResponse = { visibleCount: 0, hiddenCount: 0, items: [] };

/**
 * Loads how many items use each secret. Nothing is loaded when the consumer cannot tell, so
 * check `api.usage` to know whether to show it. Items change elsewhere, so it refreshes when the
 * user comes back to the page.
 */
export const useSecretsUsage = (
  api: SecretsApi
): UseQueryResult<SecretUsageCountsResponse, SecretsHttpError> =>
  useQuery<SecretUsageCountsResponse, SecretsHttpError>({
    queryKey: ['secretsUsage', api.routes.usage?.secrets],
    queryFn: () => api.usage?.getSecretsUsage() ?? NO_SECRETS_USAGE,
    enabled: api.usage !== undefined,
    retry: false,
    refetchOnWindowFocus: true,
  });

/**
 * Loads which items use one secret. Set `enabled` to false until the list is needed, because it
 * is one request for each secret.
 */
export const useSecretUsage = ({
  api,
  name,
  enabled,
}: {
  api: SecretsApi;
  name: string;
  enabled: boolean;
}): UseQueryResult<SecretUsageResponse, SecretsHttpError> =>
  useQuery<SecretUsageResponse, SecretsHttpError>({
    queryKey: ['secretUsage', api.routes.usage?.secret, name],
    queryFn: () => api.usage?.getSecretUsage({ name }) ?? NO_SECRET_USAGE,
    enabled: enabled && api.usage !== undefined,
    retry: false,
  });
