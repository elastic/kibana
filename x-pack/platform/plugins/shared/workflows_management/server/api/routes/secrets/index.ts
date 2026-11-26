/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerCreateSecretRoute } from './create_secret';
import { registerDeleteSecretRoute } from './delete_secret';
import { registerListSecretsRoute } from './list_secrets';
import type { SecretsRouteDependencies } from './types';
import { registerUpdateSecretRoute } from './update_secret';
import type { RouteDependencies } from '../types';

/** Registers the routes that manage the secrets of a space, while secrets are enabled. */
export const registerSecretsRoutes = ({ router, getSecretsClient }: RouteDependencies): void => {
  if (!getSecretsClient) {
    return;
  }
  const deps: SecretsRouteDependencies = { router, getSecretsClient };
  registerListSecretsRoute(deps);
  registerCreateSecretRoute(deps);
  registerUpdateSecretRoute(deps);
  registerDeleteSecretRoute(deps);
};
