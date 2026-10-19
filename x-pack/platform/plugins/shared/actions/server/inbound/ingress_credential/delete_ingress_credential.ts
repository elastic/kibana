/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { findIngressCredentialsForConnector } from './find_ingress_credentials';

export const deleteIngressCredentialForConnector = async ({
  unsecuredSavedObjectsClient,
  connectorId,
  logger,
  keepCredentialId,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  connectorId: string;
  logger: Logger;
  keepCredentialId?: string;
}): Promise<void> => {
  const credentials = await findIngressCredentialsForConnector({
    unsecuredSavedObjectsClient,
    connectorId,
  });
  const toDelete = credentials.filter(
    (credential) => !(keepCredentialId && credential.id === keepCredentialId)
  );

  if (toDelete.length === 0) {
    return;
  }

  const result = await unsecuredSavedObjectsClient.bulkDelete(
    toDelete.map((credential) => ({
      type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      id: credential.id,
    }))
  );

  const failures = result.statuses.filter((status) => !status.success);
  if (failures.length > 0) {
    const message = `Failed to delete ${failures.length} ingest credential(s) for connector "${connectorId}"`;
    logger.error(message);
    throw new Error(message);
  }
};
