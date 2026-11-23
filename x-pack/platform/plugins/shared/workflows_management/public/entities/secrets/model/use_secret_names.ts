/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { WorkflowSecretsListResponse } from '../../../../common/lib/secrets/api';
import { WORKFLOW_SECRETS_ROUTE } from '../../../../common/lib/secrets/api';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Loads the names of the secrets of the current space. Returns undefined while they load and
 * when they cannot be listed (secrets are turned off, or the user may not list them).
 */
export const useSecretNames = (): ReadonlySet<string> | undefined => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['workflowSecretNames'],
    queryFn: () => http.get<WorkflowSecretsListResponse>(WORKFLOW_SECRETS_ROUTE),
    retry: false,
    refetchOnWindowFocus: true,
  });
  return useMemo(() => (data ? new Set(data.secrets.map(({ name }) => name)) : undefined), [data]);
};
