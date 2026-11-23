/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { QueryKey, UseQueryResult } from '@kbn/react-query';
import type { SecretsListResponse } from '@kbn/secrets';
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
