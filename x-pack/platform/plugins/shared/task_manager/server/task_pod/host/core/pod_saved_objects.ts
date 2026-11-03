/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsExtensions,
  SavedObjectsEncryptionExtensionFactory,
} from '@kbn/core-saved-objects-server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { PodSpacesExtension } from './pod_spaces_extension';
import { POD_KIBANA_VERSION } from '../version';

type RegisteredType = Parameters<SavedObjectTypeRegistry['registerType']>[0];

type SavedObjectsInternals = typeof import('@kbn/core-saved-objects-base-server-internal') &
  typeof import('@kbn/core-saved-objects-migration-server-internal') &
  typeof import('@kbn/core-saved-objects-api-server-internal');

const importSavedObjectsInternals = async (): Promise<SavedObjectsInternals> => ({
  ...(await import('@kbn/core-saved-objects-base-server-internal')),
  ...(await import('@kbn/core-saved-objects-migration-server-internal')),
  ...(await import('@kbn/core-saved-objects-api-server-internal')),
});

/** The request a Core internal client is given: it carries no user and is in the default space. */
const INTERNAL_REQUEST = { headers: {}, spaceId: 'default' } as unknown as KibanaRequest;

/**
 * Saved objects in a pod, assembled from the same building blocks as Core's `SavedObjectsService`
 * (type registry, `KibanaMigrator` for its document migrations, `SavedObjectsRepository`,
 * `SavedObjectsClientProvider`, `SavedObjectsClient`) and started like it with
 * `migrations.skip: true`: the migrator only prepares its migration maps and never touches
 * Elasticsearch. `SavedObjectsService` itself needs the HTTP, deprecations and core usage services
 * and a cluster that has been migrated by Kibana; a pod only reads and writes through it.
 *
 * Like Kibana with the security plugin, request-scoped clients use the internal repository; the
 * run's fake request only selects the space (and the encryption extension).
 */
export class PodSavedObjects {
  private readonly registeredTypes: RegisteredType[] = [];
  private typeRegistry?: SavedObjectTypeRegistry;
  private internals?: SavedObjectsInternals;
  private encryptionExtensionFactory?: SavedObjectsEncryptionExtensionFactory;

  public readonly setup = {
    /** Like Core's: the Encrypted Saved Objects plugin hands over the extension that encrypts attributes. */
    setEncryptionExtension: (factory: SavedObjectsEncryptionExtensionFactory) => {
      this.encryptionExtensionFactory = factory;
    },
    getDefaultIndex: () => MAIN_SAVED_OBJECT_INDEX,
    registerType: (type: RegisteredType) => {
      if (this.internals) {
        throw new Error(`Saved object type '${type.name}' registered after setup`);
      }
      this.registeredTypes.push(type);
    },
  };

  public get hasTypes() {
    return this.registeredTypes.length > 0;
  }

  /** Loads the saved objects implementation. Call once after every plugin's setup, before start. */
  public async load() {
    this.internals = await importSavedObjectsInternals();
    this.typeRegistry = new this.internals.SavedObjectTypeRegistry();
    this.registeredTypes.forEach((type) => this.typeRegistry!.registerType(type));
  }

  public start(client: Client, logger: Logger) {
    const internals = this.internals;
    if (!internals) throw new Error('Saved objects are not loaded');
    const typeRegistry = this.getTypeRegistry();

    const migrator = new internals.KibanaMigrator({
      client: client as never,
      typeRegistry,
      hashToVersionMap: {},
      // Only fields the constructor path (not `runMigrations`) reads: a pod never runs a migration.
      soMigrationsConfig: { batchSize: 1000 } as never,
      kibanaIndex: MAIN_SAVED_OBJECT_INDEX,
      kibanaVersion: POD_KIBANA_VERSION,
      logger,
      docLinks: {} as never,
      waitForMigrationCompletion: false,
      nodeRoles: { backgroundTasks: true, ui: false, migrator: false } as never,
      esCapabilities: {} as never,
    });
    // Builds the active-migrations map from the type registry without touching ES; without it,
    // `migrateDocument` / `isDowngradeRequired` throw on every read.
    migrator.prepareMigrations();

    const createInternalRepository = (
      includedHiddenTypes: string[] = [],
      extensions?: SavedObjectsExtensions
    ): ISavedObjectsRepository => {
      // A pod loads a subset of the plugins, so the hidden types of plugins outside its family do
      // not exist here; Kibana always has them.
      let hidden = includedHiddenTypes.filter((type) => typeRegistry.getType(type) !== undefined);
      // A repository needs at least one type. Kibana always has visible ones; a pod whose plugins
      // only register hidden types would otherwise be unable to create the internal repository.
      if (hidden.length === 0 && typeRegistry.getVisibleTypes().length === 0) {
        hidden = typeRegistry.getAllTypes().map((type) => type.name);
      }
      return internals.SavedObjectsRepository.createRepository(
        migrator,
        typeRegistry,
        MAIN_SAVED_OBJECT_INDEX,
        client as never,
        logger,
        hidden,
        extensions
      );
    };

    const clientProvider = new internals.SavedObjectsClientProvider({
      defaultClientFactory: ({ includedHiddenTypes, extensions }) =>
        new internals.SavedObjectsClient(createInternalRepository(includedHiddenTypes, extensions)),
      typeRegistry,
      encryptionExtensionFactory: this.encryptionExtensionFactory,
      spacesExtensionFactory: ({ request }) =>
        new PodSpacesExtension((request as { spaceId?: string })?.spaceId ?? 'default'),
    });

    const allIndices = [
      ...new Set(
        typeRegistry.getAllTypes().map((type) => type.indexPattern ?? MAIN_SAVED_OBJECT_INDEX)
      ),
    ];
    const getIndexForType = (type: string) =>
      typeRegistry.getType(type)?.indexPattern ?? MAIN_SAVED_OBJECT_INDEX;

    return {
      getScopedClient: clientProvider.getClient.bind(clientProvider),
      getUnsafeInternalClient: ({
        includedHiddenTypes,
        excludedExtensions = [],
      }: { includedHiddenTypes?: string[]; excludedExtensions?: string[] } = {}) =>
        new internals.SavedObjectsClient(
          createInternalRepository(
            includedHiddenTypes,
            clientProvider.getExtensions(INTERNAL_REQUEST, excludedExtensions)
          )
        ),
      createScopedRepository: (
        request: KibanaRequest,
        includedHiddenTypes?: string[],
        extensions?: SavedObjectsExtensions
      ) => createInternalRepository(includedHiddenTypes, extensions),
      createInternalRepository: (
        includedHiddenTypes?: string[],
        extensions?: SavedObjectsExtensions
      ) => createInternalRepository(includedHiddenTypes, extensions),
      createSerializer: () => new internals.SavedObjectsSerializer(typeRegistry),
      getTypeRegistry: () => typeRegistry,
      getDefaultIndex: () => MAIN_SAVED_OBJECT_INDEX,
      getIndexForType,
      getIndicesForTypes: (types: string[]) => [...new Set(types.map(getIndexForType))],
      getAllIndices: () => [...allIndices],
      metrics: { migrationDuration: 0 },
    };
  }

  private getTypeRegistry(): SavedObjectTypeRegistry {
    if (!this.typeRegistry) {
      throw new Error(
        'Saved objects are not loaded: no pod plugin registered a saved object type during setup'
      );
    }
    return this.typeRegistry;
  }
}
