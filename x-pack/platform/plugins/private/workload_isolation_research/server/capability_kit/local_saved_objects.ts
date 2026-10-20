/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import {
  DocumentMigrator,
  buildActiveMappings,
  buildTypesMappings,
} from '@kbn/core-saved-objects-migration-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import type {
  SavedObjectsType,
  ISavedObjectsSecurityExtension,
  ISavedObjectsEncryptionExtension,
} from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkerContext } from './protocol';
import { decode } from './codecs';

export interface SoRegistration {
  readonly revision: string;
  readonly types: readonly SavedObjectsType[];
  readonly encryptedTypes: readonly EncryptedSavedObjectTypeRegistration[];
}
export interface LocalSoCapability {
  readonly principal: string;
  readonly space: string;
  readonly mode: 'internal' | 'scoped';
  readonly index: string;
  readonly kibanaVersion: string;
  readonly registryId: string;
  readonly registryRevision: string;
  readonly esoFactoryId?: string;
  readonly encryptionKey?: string;
  readonly decryptionOnlyKeys?: readonly string[];
  readonly includedHiddenTypes: readonly string[];
  readonly migrationReady: boolean;
}
interface LocalEsoKernel {
  readonly extension: ISavedObjectsEncryptionExtension;
  readonly service: {
    decryptAttributes<T extends object>(
      descriptor: { type: string; id: string; namespace?: string },
      attributes: T
    ): Promise<T>;
    getEncryptedAttributes(type: string): ReadonlySet<string> | undefined;
  };
}
type EsoFactory = (options: {
  encryptionKey: string;
  decryptionOnlyKeys: readonly string[];
  types: readonly EncryptedSavedObjectTypeRegistration[];
  typeRegistry: SavedObjectTypeRegistry;
  logger: Logger;
  getCurrentUser: () => Promise<
    Exclude<ReturnType<ISavedObjectsSecurityExtension['getCurrentUser']>, null> | undefined
  >;
}) => LocalEsoKernel;
const optionsFor = (value: object | undefined, namespace: string | undefined): object => {
  const options = value ?? {};
  if (['namespace', 'namespaces', 'spaceId'].some((key) => key in options))
    throw new Error('Local SO namespace is pinned by capability');
  return { ...options, namespace };
};

/** Composes real document migrations/repository/ESO locally, with explicit control-plane readiness and scope fences. */
export const createLocalSavedObjects = async (
  context: WorkerContext,
  client: ElasticsearchClient,
  logger: Logger,
  securityExtension?: ISavedObjectsSecurityExtension
) => {
  const data = context.bundle.data
    ? (decode(context.bundle.data) as { savedObjectsLocal?: LocalSoCapability })
    : {};
  const capability = data.savedObjectsLocal;
  if (!capability || !capability.migrationReady)
    throw new Error('Local SO requires control-plane migration readiness');
  if (
    capability.principal !== context.bundle.principal ||
    capability.space !== context.bundle.space
  )
    throw new Error('Foreign local SO capability');
  if (capability.mode === 'scoped' && !securityExtension)
    throw new Error(
      'Scoped local SO requires the real security/audit extension; use main scoped bridge'
    );
  if (capability.mode !== 'internal' && capability.mode !== 'scoped')
    throw new Error('Invalid local SO authority mode');
  const registrations = (await context.load(capability.registryId)) as SoRegistration;
  if (registrations.revision !== capability.registryRevision)
    throw new Error('SO registration/migration revision mismatch');
  const registry = new SavedObjectTypeRegistry();
  for (const type of registrations.types) registry.registerType(type);
  const documentMigrator = new DocumentMigrator({
    kibanaVersion: capability.kibanaVersion,
    typeRegistry: registry,
    log: logger,
  });
  documentMigrator.prepareMigrations();
  const mappings = buildActiveMappings(buildTypesMappings(registry.getAllTypes()));
  const migrator: IKibanaMigrator = {
    kibanaVersion: capability.kibanaVersion,
    prepareMigrations: () => documentMigrator.prepareMigrations(),
    getActiveMappings: () => mappings,
    getDocumentMigrator: () => documentMigrator,
    migrateDocument: (document, options) => documentMigrator.migrate(document, options),
    getStatus$: () => of({ status: 'completed' as const }),
    runMigrations: async () => {
      throw new Error('Startup migrations are control-plane owned');
    },
  };
  let eso: LocalEsoKernel | undefined;
  if (registrations.encryptedTypes.length) {
    if (!capability.encryptionKey || !capability.esoFactoryId)
      throw new Error('Local ESO requires a configured key/factory capability');
    const factory = (await context.load(capability.esoFactoryId)) as EsoFactory;
    eso = factory({
      encryptionKey: capability.encryptionKey,
      decryptionOnlyKeys: capability.decryptionOnlyKeys ?? [],
      types: registrations.encryptedTypes,
      typeRegistry: registry,
      logger,
      getCurrentUser: async () => securityExtension?.getCurrentUser() ?? undefined,
    });
  }
  const repository = SavedObjectsRepository.createRepository(
    migrator,
    registry,
    capability.index,
    client,
    logger,
    [...capability.includedHiddenTypes],
    { encryptionExtension: eso?.extension, securityExtension }
  );
  const namespace = capability.space === 'default' ? undefined : capability.space;
  let encryptedRepository: typeof repository | undefined;
  const options = (value?: object) => optionsFor(value, namespace);
  return {
    get: (type: string, id: string, opts?: object) => repository.get(type, id, options(opts)),
    resolve: (type: string, id: string, opts?: object) =>
      repository.resolve(type, id, options(opts)),
    bulkGet: (objects: Array<{ type: string; id: string }>, opts?: object) => {
      if (objects.some((object) => 'namespace' in object || 'namespaces' in object))
        throw new Error('Bulk SO namespace override denied');
      return repository.bulkGet(objects, options(opts));
    },
    find: (type: string, opts?: object) => repository.find({ ...options(opts), type }),
    create: (type: string, attributes: object, opts?: object) =>
      repository.create(type, attributes, options(opts)),
    update: (type: string, id: string, attributes: object, opts?: object) => {
      const encrypted = registrations.encryptedTypes.find((entry) => entry.type === type);
      if (encrypted) {
        const blocked = new Set([
          ...(eso?.service.getEncryptedAttributes(type) ?? []),
          ...(encrypted.attributesToIncludeInAAD ?? []),
        ]);
        if (Object.keys(attributes).some((key) => blocked.has(key)))
          throw new Error('Partial ESO update cannot modify encrypted/AAD attributes');
      }
      return repository.update(type, id, attributes, options(opts));
    },
    delete: (type: string, id: string, opts?: object) => repository.delete(type, id, options(opts)),
    getDecryptedAsInternalUser: async (type: string, id: string) => {
      if (capability.mode !== 'internal' || !eso?.service)
        throw new Error('Decryption requires explicit internal ESO authority');
      if (
        !registrations.encryptedTypes.some((entry) => entry.type === type) ||
        (registry.isHidden(type) && !capability.includedHiddenTypes.includes(type))
      )
        throw new Error('Encrypted type not granted');
      // Keep document migrations, aliases and namespace checks in the real repository.
      encryptedRepository ??= SavedObjectsRepository.createRepository(
        migrator,
        registry,
        capability.index,
        client,
        logger,
        [...capability.includedHiddenTypes],
        { securityExtension }
      );
      const encrypted = await encryptedRepository.get<object>(type, id, { namespace });
      return eso.service.decryptAttributes(
        { type, id, namespace: registry.isSingleNamespace(type) ? namespace : undefined },
        encrypted.attributes
      );
    },
    info: {
      registeredTypes: registry.getAllTypes().length,
      registryRevision: registrations.revision,
      esoTypes: registrations.encryptedTypes.length,
    },
  };
};
