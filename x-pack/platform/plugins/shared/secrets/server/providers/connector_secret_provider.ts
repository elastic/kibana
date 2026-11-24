/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { SpaceId } from '@kbn/core-spaces-common';
import { SECRET_PROVIDER_TYPE, SECRET_VALUE_MIN_LENGTH, SecretValidationError } from '@kbn/secrets';
import type { ConnectorSecretProvider, SecretConnector } from '@kbn/secrets';
import type { ConnectorSecretReader } from './connector_secret_readers';
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
  secretReaders: ReadonlyMap<string, ConnectorSecretReader>;
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
  secretReaders,
}: CreateConnectorSecretProviderParams): ConnectorSecretProvider => {
  const getSecretReader = (connectorTypeId: string): ConnectorSecretReader => {
    const reader = secretReaders.get(connectorTypeId);
    if (!reader) {
      throw new SecretValidationError('The connector is not a supported secret manager');
    }
    return reader;
  };

  const getConnectorTypeId = async (connectorId: string): Promise<string> => {
    const connectors = await actions.getUnsecuredActionsClient().getAll(spaceId);
    const connector = connectors.find(({ id }) => id === connectorId);
    if (!connector) {
      throw new Error('Its connector no longer exists');
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
      getSecretReader(connector.actionTypeId).getReadParams(reference);
    },

    listSecretConnectors: async () => {
      // The client of the request only returns the connectors that its user may access.
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connectors: SecretConnector[] = [];
      for (const { id, name, actionTypeId } of await actionsClient.getAll()) {
        const reader = secretReaders.get(actionTypeId);
        if (reader) {
          const { displayName, referenceFormat } = reader;
          connectors.push({
            id,
            name,
            type: { connectorTypeId: actionTypeId, displayName, referenceFormat },
          });
        }
      }
      return connectors;
    },

    resolve: async ({ entry: { name, connectorId, reference } }) => {
      const reader = getSecretReader(await getConnectorTypeId(connectorId));
      const { subAction, subActionParams } = reader.getReadParams(reference);
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
        // What the service answered names accounts and resources, and differs for each secret
        // manager. The actions plugin already logs it, so the reader of a run or of a test
        // gets the same short explanation whatever the connector.
        throw new Error(
          'Its connector could not read it: either the connector does not have permission, or the reference is wrong'
        );
      }
      const value = reader.getValue(result.data);
      if (value === undefined) {
        throw new Error('The secret manager returned no value');
      }
      // A shorter value cannot be masked: it would match unrelated text in what a run stores.
      if (value.length < SECRET_VALUE_MIN_LENGTH) {
        throw new Error(
          `The secret manager returned a value shorter than ${SECRET_VALUE_MIN_LENGTH} characters, which cannot be used as a secret`
        );
      }
      return value;
    },
  };
};
