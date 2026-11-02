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
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { POD_KIBANA_VERSION } from '../version';

type RegisteredType = Parameters<SavedObjectTypeRegistry['registerType']>[0];

type SavedObjectsInternals = typeof import('@kbn/core-saved-objects-base-server-internal') &
  typeof import('@kbn/core-saved-objects-migration-server-internal') &
  typeof import('@kbn/core-saved-objects-api-server-internal');

/**
 * The repository, migrator and type registry are the bulk of what a pod loads for saved objects
 * (~100+ MB RSS). They are a separate chunk loaded by `load()`, which the host only calls when a
 * pod plugin registered a saved object type, so ES-only pods never read or parse them.
 */
const importSavedObjectsInternals = async (): Promise<SavedObjectsInternals> => ({
  ...(await import('@kbn/core-saved-objects-base-server-internal')),
  ...(await import('@kbn/core-saved-objects-migration-server-internal')),
  ...(await import('@kbn/core-saved-objects-api-server-internal')),
});

/** The Kibana version this bundle was built against; only used for migration bookkeeping. */
const KIBANA_VERSION = POD_KIBANA_VERSION;

type EncryptionExtensionFactory = (params: {
  typeRegistry: ISavedObjectTypeRegistry;
  request: KibanaRequest;
}) => unknown;

// Index of the options argument (where `namespace` goes) per repository method.
const NAMESPACE_OPTION_ARG: Record<string, number> = {
  create: 2,
  bulkCreate: 1,
  bulkGet: 1,
  get: 2,
  update: 3,
  bulkUpdate: 1,
  delete: 2,
  bulkDelete: 1,
  checkConflicts: 1,
  incrementCounter: 3,
  removeReferencesTo: 2,
  resolve: 2,
  bulkResolve: 1,
};
// Index of the options argument (where `namespaces` goes) per repository method.
const NAMESPACES_OPTION_ARG: Record<string, number> = {
  find: 0,
  createPointInTimeFinder: 0,
  openPointInTimeForType: 1,
};

/**
 * What the Spaces plugin's saved objects extension does in Kibana: a client scoped to a request
 * reads and writes in that request's space unless the caller says otherwise.
 */
const scopeToSpace = (
  repository: ISavedObjectsRepository,
  spaceId: string
): ISavedObjectsRepository => {
  const namespace = SavedObjectsUtils.namespaceStringToId(spaceId);
  return new Proxy(repository, {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || typeof prop !== 'string') return value;
      return (...args: unknown[]) => {
        const optionsArg = NAMESPACE_OPTION_ARG[prop];
        if (optionsArg !== undefined) {
          const options = (args[optionsArg] ?? {}) as { namespace?: string };
          args[optionsArg] = { ...options, namespace: options.namespace ?? namespace };
        } else if (NAMESPACES_OPTION_ARG[prop] !== undefined) {
          const index = NAMESPACES_OPTION_ARG[prop];
          const options = (args[index] ?? {}) as { namespaces?: string[] };
          args[index] = { ...options, namespaces: options.namespaces ?? [spaceId] };
        }
        return value.apply(target, args);
      };
    },
  });
};

/**
 * Saved objects for a pod: every pod plugin registers its types during setup into one shared
 * registry (as in Kibana), then start builds real `SavedObjectsRepository` instances over it. Each
 * type carries its own `indexPattern`, so one registry routes to every system index.
 */
export class PodSavedObjects {
  private readonly registeredTypes: RegisteredType[] = [];
  private typeRegistry?: SavedObjectTypeRegistry;
  private internals?: SavedObjectsInternals;
  private readonly repositories = new Map<string, ISavedObjectsRepository>();
  private client?: Client;
  private logger?: Logger;
  private encryptionExtensionFactory?: EncryptionExtensionFactory;

  public readonly setup = {
    /**
     * Like Core's: the Encrypted Saved Objects plugin hands over the extension that encrypts and
     * decrypts attributes. It applies to request-scoped clients, as in Kibana; the internal
     * repository stays plain and decryption is explicit through the ESO client.
     */
    setEncryptionExtension: (factory: EncryptionExtensionFactory) => {
      this.encryptionExtensionFactory = factory;
    },
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
    this.client = client;
    this.logger = logger;
    return {
      getTypeRegistry: () => this.getTypeRegistry(),
      createInternalRepository: (includedHiddenTypes?: string[]) =>
        this.getRepository(includedHiddenTypes),
      createSerializer: () => new this.internals!.SavedObjectsSerializer(this.getTypeRegistry()),
      /**
       * A client over the internal user with the encryption extension, for code that creates or
       * reads encrypted objects without a request. Extensions are not otherwise modelled in a pod,
       * so `excludedExtensions` (security, spaces) is accepted and has nothing to exclude.
       */
      getUnsafeInternalClient: (options?: {
        includedHiddenTypes?: string[];
        excludedExtensions?: string[];
      }) =>
        this.getRepository(
          options?.includedHiddenTypes,
          this.encryptionExtensionFactory && {
            encryptionExtension: this.encryptionExtensionFactory({
              typeRegistry: this.getTypeRegistry(),
              request: undefined as never,
            }),
          }
        ),
      getScopedClient: (
        request: KibanaRequest & { spaceId?: string },
        options?: { includedHiddenTypes?: string[]; excludedExtensions?: string[] }
      ) =>
        scopeToSpace(
          this.getRepository(
            options?.includedHiddenTypes,
            this.encryptionExtensionFactory && {
              encryptionExtension: this.encryptionExtensionFactory({
                typeRegistry: this.getTypeRegistry(),
                request,
              }),
            }
          ),
          request.spaceId ?? 'default'
        ),
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

  private getRepository(
    includedHiddenTypes?: string[],
    extensions?: Record<string, unknown>
  ): ISavedObjectsRepository {
    const hidden = (includedHiddenTypes ?? []).slice().sort();
    const key = hidden.join(',');
    // Repositories with per-request extensions are not shared.
    const existing = extensions ? undefined : this.repositories.get(key);
    if (existing) return existing;
    if (!this.client || !this.logger) throw new Error('Saved objects are not started');

    const { KibanaMigrator, SavedObjectsRepository } = this.internals!;
    const typeRegistry = this.getTypeRegistry();
    const migrator = new KibanaMigrator({
      client: this.client as never,
      typeRegistry,
      hashToVersionMap: {},
      // Only fields the constructor path (not `runMigrations`) reads: a pod never runs a migration.
      soMigrationsConfig: { batchSize: 1000 } as never,
      kibanaIndex: '.kibana',
      kibanaVersion: KIBANA_VERSION,
      logger: this.logger,
      docLinks: {} as never,
      waitForMigrationCompletion: false,
      nodeRoles: { backgroundTasks: true, ui: false, migrator: false } as never,
      esCapabilities: {} as never,
    });
    // Builds the active-migrations map from the type registry without touching ES; without it,
    // `migrateDocument` / `isDowngradeRequired` throw on every read.
    migrator.prepareMigrations();

    const repository = SavedObjectsRepository.createRepository(
      migrator,
      typeRegistry,
      '.kibana',
      this.client as never,
      this.logger,
      hidden,
      extensions as never
    );
    if (!extensions) this.repositories.set(key, repository);
    return repository;
  }
}
