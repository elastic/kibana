/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECRET_PROVIDER_TYPE } from '../constants';
import type { KibanaSecretEntry, SecretProvider } from '../types';

/** Creates the provider for secrets whose value is stored in Kibana. */
export const createKibanaSecretProvider = (): SecretProvider<KibanaSecretEntry> => ({
  type: SECRET_PROVIDER_TYPE.kibana,
  resolve: async ({ entry }) => entry.value,
});
