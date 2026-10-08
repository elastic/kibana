/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import type { RawConnectorIngressCredential } from './types';

export const loadIngressCredential = async ({
  unsecuredSavedObjectsClient,
  credentialId,
  connectorId,
}: {
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  credentialId: string;
  connectorId: string;
}): Promise<RawConnectorIngressCredential | undefined> => {
  try {
    const result = await unsecuredSavedObjectsClient.get<RawConnectorIngressCredential>(
      CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      credentialId
    );
    if (result.attributes.connectorId !== connectorId) {
      return undefined;
    }
    return result.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};
