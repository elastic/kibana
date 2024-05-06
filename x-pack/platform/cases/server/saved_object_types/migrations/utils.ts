/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import valid from 'semver/functions/valid';
import gte from 'semver/functions/gte';

import type {
  LogMeta,
  SavedObjectMigrationContext,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { isFunction, mapValues } from 'lodash';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { SavedObjectMigrationParams } from '@kbn/core-saved-objects-server';
import type { MigrateFunction, MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import type { AttachmentPersistedAttributes } from '../../common/types/attachments';
import { AttachmentType } from '../../../common/types/domain';
import type {
  PersistableStateAttachmentAttributes,
  UserCommentAttachmentAttributes,
} from '../../../common/types/domain';

interface MigrationLogMeta extends LogMeta {
  migrations: {
    [x: string]: {
      id: string;
    };
  };
}

export function logError({
  id,
  context,
  error,
  docType,
  docKey,
}: {
  id: string;
  context: SavedObjectMigrationContext;
  error: Error;
  docType: string;
  docKey: string;
}) {
  context.log.error<MigrationLogMeta>(
    `Failed to migrate ${docType} with doc id: ${id} version: ${context.migrationVersion} error: ${error.message}`,
    {
      migrations: {
        [docKey]: {
          id,
        },
      },
    }
  );
}

type CaseMigration<T> = (doc: SavedObjectUnsanitizedDoc<T>) => SavedObjectUnsanitizedDoc<T>;

export function pipeMigrations<T>(...migrations: Array<CaseMigration<T>>): CaseMigration<T> {
  return (doc: SavedObjectUnsanitizedDoc<T>) =>
    migrations.reduce((migratedDoc, nextMigration) => nextMigration(migratedDoc), doc);
}

export const isDeferredMigration = (
  minDeferredKibanaVersion: string,
  migrationVersion: string
): boolean =>
  Boolean(
    valid(migrationVersion) &&
      valid(minDeferredKibanaVersion) &&
      gte(migrationVersion, minDeferredKibanaVersion)
  );

export const isUserCommentSO = (
  doc: SavedObjectUnsanitizedDoc<AttachmentPersistedAttributes>
): doc is SavedObjectUnsanitizedDoc<UserCommentAttachmentAttributes> => {
  return doc.attributes.type === AttachmentType.user;
};

export const isPersistableStateAttachmentSO = (
  doc: SavedObjectUnsanitizedDoc<AttachmentPersistedAttributes>
): doc is SavedObjectUnsanitizedDoc<PersistableStateAttachmentAttributes> => {
  return doc.attributes.type === AttachmentType.persistableState;
};

interface GetLensMigrationsArgs<T> {
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  migratorFactory: (
    migrate: MigrateFunction,
    migrationVersion: string
  ) => SavedObjectMigrationParams<T, T>;
}

export const getLensMigrations = <T>({
  lensEmbeddableFactory,
  migratorFactory,
}: GetLensMigrationsArgs<T>) => {
  const lensMigrations = lensEmbeddableFactory().migrations;
  const lensMigrationObject = isFunction(lensMigrations) ? lensMigrations() : lensMigrations || {};

  const embeddableMigrations = mapValues<MigrateFunctionsObject, SavedObjectMigrationParams<T, T>>(
    lensMigrationObject,
    migratorFactory
  );

  return embeddableMigrations;
};
