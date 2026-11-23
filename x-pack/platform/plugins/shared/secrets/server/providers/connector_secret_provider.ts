/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { SECRET_PROVIDER_TYPE, SecretValidationError } from '@kbn/secrets';
import type { ConnectorSecretProvider } from '@kbn/secrets';
import type { SecretManager } from './secret_managers';
import {
  getSecretSavedObjectId,
  SECRET_SAVED_OBJECT_TYPE,
} from '../saved_objects/secret_saved_object';

// Allow-listed in the actions plugin for running connectors without a user request.
const SECRETS_REQUESTER_ID = 'secrets';

export interface CreateConnectorSecretProviderParams {
  actions: ActionsPluginStart;
  /** The request of the caller. Only used to check what the author of a secret may access. */
  request: KibanaRequest;
  spaceId: SpaceId;
  /** The connector types that can hold secrets, by connector type id. */
  secretManagers: ReadonlyMap<string, SecretManager>;
}

/**
 * Creates the provider of secrets that live in an external manager, for one space.
 * Writing a secret needs access to its connector. Reading its value does not: the connector
 * runs as Kibana, so that using a secret only needs the consumer's own privilege.
 */
export const createConnectorSecretProvider = ({
  actions,
  request,
  spaceId,
  secretManagers,
}: CreateConnectorSecretProviderParams): ConnectorSecretProvider => {
  const getSecretManager = (connectorTypeId: string): SecretManager => {
    const secretManager = secretManagers.get(connectorTypeId);
    if (!secretManager) {
      throw new SecretValidationError('The connector is not a supported secret manager');
    }
    return secretManager;
  };

  const getConnectorTypeId = async (connectorId: string): Promise<string> => {
    const connectors = await actions.getUnsecuredActionsClient().getAll(spaceId);
    const connector = connectors.find(({ id }) => id === connectorId);
    if (!connector) {
      throw new Error('its connector no longer exists');
    }
    return connector.actionTypeId;
  };

  return {
    type: SECRET_PROVIDER_TYPE.connector,

    validateSource: async ({ source: { connectorId, reference } }) => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      // Fails when the connector does not exist or when the caller may not read connectors.
      const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
      if (!connector) {
        throw new SecretValidationError(
          'The connector does not exist in this space, or you do not have access to it'
        );
      }
      getSecretManager(connector.actionTypeId).getReadParams(reference);
    },

    resolve: async ({ entry: { name, connectorId, reference } }) => {
      const secretManager = getSecretManager(await getConnectorTypeId(connectorId));
      const { subAction, subActionParams } = secretManager.getReadParams(reference);
      const result = await actions.getUnsecuredActionsClient().execute({
        requesterId: SECRETS_REQUESTER_ID,
        id: connectorId,
        params: { subAction, subActionParams },
        spaceId,
        relatedSavedObjects: [
          { type: SECRET_SAVED_OBJECT_TYPE, id: getSecretSavedObjectId({ spaceId, name }) },
        ],
      });
      if (result.status !== 'ok') {
        throw new Error(result.serviceMessage ?? result.message ?? 'the connector call failed');
      }
      const value = secretManager.getValue(result.data);
      if (value === undefined) {
        throw new Error('the secret manager returned no value');
      }
      return value;
    },
  };
};
