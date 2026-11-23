/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SecretMetadata } from '@kbn/secrets';
import { useSecrets } from '@kbn/secrets-ui';
import { useSecretsApi } from './use_secrets_api';

// Undefined while the secrets load and when they cannot be listed (secrets are turned off, or
// the user may not list them).
const useSecretsList = (): SecretMetadata[] | undefined => {
  const api = useSecretsApi();
  return useSecrets(api).data?.secrets;
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
