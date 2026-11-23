/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { SecretMetadata } from '@kbn/secrets';
import type { WorkflowSecretsListResponse } from '../../../../common/lib/secrets/api';
import { WORKFLOW_SECRETS_ROUTE } from '../../../../common/lib/secrets/api';
import { useKibana } from '../../../hooks/use_kibana';

// Undefined while the secrets load and when they cannot be listed (secrets are turned off, or
// the user may not list them).
const useSecretsList = (): SecretMetadata[] | undefined => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['workflowSecretNames'],
    queryFn: () => http.get<WorkflowSecretsListResponse>(WORKFLOW_SECRETS_ROUTE),
    retry: false,
    refetchOnWindowFocus: true,
  });
  return data?.secrets;
};

/** The names of the secrets of the current space. Undefined when they are not available. */
export const useSecretNames = (): ReadonlySet<string> | undefined => {
  const secrets = useSecretsList();
  return useMemo(() => secrets && new Set(secrets.map(({ name }) => name)), [secrets]);
};

/** The description of each secret of the current space, by name. */
export const useSecretDescriptions = (): ReadonlyMap<string, string | undefined> | undefined => {
  const secrets = useSecretsList();
  return useMemo(
    () => secrets && new Map(secrets.map(({ name, description }) => [name, description])),
    [secrets]
  );
};
