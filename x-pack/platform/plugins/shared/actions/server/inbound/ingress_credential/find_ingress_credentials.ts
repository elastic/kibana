/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import type { RawConnectorIngressCredential } from './types';

const FIND_PAGE_SIZE = 10;
const FIND_MAX_PAGES = 20;

export const findIngressCredentialsForConnector = async ({
  unsecuredSavedObjectsClient,
  connectorId,
}: {
  unsecuredSavedObjectsClient: Pick<SavedObjectsClientContract, 'find'>;
  connectorId: string;
}): Promise<Array<SavedObject<RawConnectorIngressCredential>>> => {
  const type = CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE;
  const filter = `${type}.attributes.connectorId:"${connectorId}"`;
  const collected: Array<SavedObject<RawConnectorIngressCredential>> = [];
  let total = 0;

  for (let page = 1; page <= FIND_MAX_PAGES; page++) {
    const result = await unsecuredSavedObjectsClient.find<RawConnectorIngressCredential>({
      type,
      filter,
      perPage: FIND_PAGE_SIZE,
      page,
    });
    total = result.total;
    collected.push(...(result.saved_objects ?? []));

    if (collected.length >= total || (result.saved_objects?.length ?? 0) === 0) {
      break;
    }
  }

  if (collected.length < total) {
    throw new Error(
      `Found ${total} ingest credential(s) for connector "${connectorId}" but only loaded ${collected.length}`
    );
  }

  return collected;
};
