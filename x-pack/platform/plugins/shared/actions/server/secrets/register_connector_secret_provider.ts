/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import { SECRET_PROVIDER_TYPE } from '@kbn/secrets';
import type { SecretsPluginSetup } from '@kbn/secrets-plugin/server';
import { createConnectorSecretProvider } from './connector_secret_provider';
import type { CreateConnectorSecretProviderParams } from './connector_secret_provider';
import { createConnectorSecretReaders } from './connector_secret_readers';

export interface RegisterConnectorSecretProviderParams
  extends Pick<CreateConnectorSecretProviderParams, 'getActionsStart'> {
  secrets: SecretsPluginSetup;
}

/** Registers, in the secrets plugin, the provider that reads secret values through connectors. */
export const registerConnectorSecretProvider = ({
  secrets,
  getActionsStart,
}: RegisterConnectorSecretProviderParams): void => {
  // Throws, so that Kibana does not start, when a listed connector type cannot read secrets.
  const secretReaders = createConnectorSecretReaders();

  secrets.registerProvider({
    type: SECRET_PROVIDER_TYPE.connector,
    create: ({ request, spaceId, getSecretSavedObject }) =>
      createConnectorSecretProvider({
        getActionsStart,
        getSecretSavedObject,
        request,
        spaceId: brandSpaceId(spaceId),
        secretReaders,
      }),
  });
};
