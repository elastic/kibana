/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds a real `SavedObjectsRepository` outside Kibana, fed only by the saved-object types a
 * plugin registered through its own `registerSavedObjects` code (captured by
 * {@link FakeSavedObjectsServiceSetup}). Uses the real `SavedObjectsTypeRegistry` and the real
 * `KibanaMigrator`'s `getActiveMappings`/`migrateDocument`, constructed without ever calling
 * `runMigrations`: the pod only reads and writes documents Kibana already migrated, so document
 * conversion only needs to be a correct no-op for up-to-date documents, which the real document
 * migrator already is.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { KibanaMigrator } from '@kbn/core-saved-objects-migration-server-internal';
import { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { CapturedSoType } from './fake_core';

/** The real Kibana version string this bundle was built against; only used for migration bookkeeping. */
const KIBANA_VERSION = process.env.POD_KIBANA_VERSION ?? '9.6.0';

export const buildSavedObjectsRepository = ({
  client,
  indexName,
  soTypes,
  logger,
  includedHiddenTypes,
}: {
  client: Client;
  indexName: string;
  soTypes: CapturedSoType[];
  logger: Logger;
  includedHiddenTypes: string[];
}): ISavedObjectsRepository => {
  const typeRegistry = new SavedObjectTypeRegistry();
  for (const type of soTypes) {
    typeRegistry.registerType(type);
  }

  const migrator = new KibanaMigrator({
    client: client as never,
    typeRegistry,
    hashToVersionMap: {},
    // Only fields the constructor path (not `runMigrations`) reads; batch sizing is irrelevant
    // because the pod never runs a migration.
    soMigrationsConfig: { batchSize: 1000 } as never,
    kibanaIndex: indexName,
    kibanaVersion: KIBANA_VERSION,
    logger,
    docLinks: {} as never,
    waitForMigrationCompletion: false,
    nodeRoles: { backgroundTasks: true, ui: false, migrator: false } as never,
    esCapabilities: {} as never,
  });
  // `prepareMigrations` builds the active-migrations map from the type registry; it never touches
  // ES (only `runMigrations()` does, which the pod never calls — documents are assumed already
  // migrated). Without it, `migrateDocument`/`isDowngradeRequired` throw on every read.
  migrator.prepareMigrations();

  return SavedObjectsRepository.createRepository(
    migrator,
    typeRegistry,
    indexName,
    client as never,
    logger,
    includedHiddenTypes
  );
};
