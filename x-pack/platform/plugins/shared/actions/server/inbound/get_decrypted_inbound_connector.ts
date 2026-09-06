/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import type { RawAction } from '../types';

const getEncryptedSavedObjectsStart = (pluginsStart: unknown): EncryptedSavedObjectsPluginStart => {
  if (
    typeof pluginsStart === 'object' &&
    pluginsStart !== null &&
    'encryptedSavedObjects' in pluginsStart &&
    typeof (pluginsStart.encryptedSavedObjects as EncryptedSavedObjectsPluginStart | undefined)
      ?.getClient === 'function'
  ) {
    return pluginsStart.encryptedSavedObjects as EncryptedSavedObjectsPluginStart;
  }

  throw new Error('Encrypted Saved Objects plugin is not available');
};

/**
 * Decrypts the inbound connector SO as the internal user so ingest can read
 * last-saver identity. Encrypted fields are stripped on the unsecured get used
 * for the ingest-token door check.
 */
export async function getDecryptedInboundConnector({
  getStartServices,
  connectorId,
  spaceId,
}: {
  getStartServices: CoreSetup['getStartServices'];
  connectorId: string;
  spaceId: string;
}): Promise<RawAction> {
  const [, pluginsStart] = await getStartServices();
  const encryptedSavedObjects = getEncryptedSavedObjectsStart(pluginsStart);
  const client = encryptedSavedObjects.getClient({
    includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
  });
  const decrypted = await client.getDecryptedAsInternalUser<RawAction>(
    ACTION_SAVED_OBJECT_TYPE,
    connectorId,
    spaceId !== DEFAULT_SPACE_ID ? { namespace: spaceId } : {}
  );
  return decrypted.attributes;
}
