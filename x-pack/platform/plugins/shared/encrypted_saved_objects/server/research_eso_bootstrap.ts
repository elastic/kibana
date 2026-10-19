/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nodeCrypto from '@elastic/node-crypto';

import type { ISavedObjectTypeRegistry, Logger } from '@kbn/core/server';

import type { EncryptedSavedObjectTypeRegistration } from './crypto/encrypted_saved_objects_service';
import { EncryptedSavedObjectsService } from './crypto/encrypted_saved_objects_service';
import { SavedObjectsEncryptionExtension } from './saved_objects/saved_objects_encryption_extension';

export interface ResearchEsoConfig {
  readonly encryptionKey: string;
  readonly decryptionOnlyKeys: readonly string[];
  readonly types: readonly EncryptedSavedObjectTypeRegistration[];
  readonly typeRegistry: ISavedObjectTypeRegistry;
  readonly logger: Logger;
}

export interface ResearchEsoKernel {
  readonly service: EncryptedSavedObjectsService;
  readonly extension: SavedObjectsEncryptionExtension;
}

/** RESEARCH ONLY: private worker capability factory, never exported through the plugin contract. */
export const createResearchEsoKernel = ({
  encryptionKey,
  decryptionOnlyKeys,
  types,
  typeRegistry,
  logger,
}: ResearchEsoConfig): ResearchEsoKernel => {
  if (encryptionKey.length < 32 || decryptionOnlyKeys.some((key) => key.length < 32)) {
    throw new Error('Research ESO encryption capability requires configured keys');
  }
  const service = new EncryptedSavedObjectsService({
    primaryCrypto: nodeCrypto({ encryptionKey }),
    decryptionOnlyCryptos: decryptionOnlyKeys.map((key) => nodeCrypto({ encryptionKey: key })),
    logger,
  });
  for (const type of types) service.registerType(type);
  const extension = new SavedObjectsEncryptionExtension({
    service,
    baseTypeRegistry: typeRegistry,
    // This constructor probe has no request-scoped identity; it is not an RBAC parity proof.
    getCurrentUser: async () => undefined,
  });
  return { service, extension };
};
