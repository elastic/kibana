/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { ALL_ENTITY_TYPES } from '../../../../common';
export const LegacyRemoteLogExtractionStateTypeName = 'entity-store-remote-state';
export const LEGACY_CCS_LOG_EXTRACTION_STATE_TYPE_NAME = 'entity-store-ccs-state';

const stateSchemaV1 = schema.object({
  checkpointTimestamp: schema.nullable(schema.string()),
  paginationRecoveryId: schema.nullable(schema.string()),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: stateSchemaV1,
    forwardCompatibility: stateSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

const baseType: Omit<SavedObjectsType, 'name'> = {
  hidden: false,
  namespaceType: 'multiple-isolated',
  // Fields are not queried, only read — no mappings needed
  mappings: { dynamic: false, properties: {} },
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};

export const LegacyRemoteLogExtractionStateType: SavedObjectsType = {
  ...baseType,
  name: LegacyRemoteLogExtractionStateTypeName,
};

/** Read/migrate only — do not create new rows under this type. */
export const LegacyCcsLogExtractionStateType: SavedObjectsType = {
  ...baseType,
  name: LEGACY_CCS_LOG_EXTRACTION_STATE_TYPE_NAME,
};

/**
 * Deletes all legacy remote-state saved objects for the given namespace.
 * Called during uninstall to clean up any instances left by older versions
 * that wrote under `entity-store-remote-state` or `entity-store-ccs-state`.
 */
export const deleteLegacyRemoteStateSavedObjects = ({
  soClient,
  namespace,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  namespace: string;
  logger: Logger;
}): Promise<void[]> =>
  Promise.all(
    [LegacyRemoteLogExtractionStateTypeName, LEGACY_CCS_LOG_EXTRACTION_STATE_TYPE_NAME].flatMap(
      (typeName) =>
        ALL_ENTITY_TYPES.map((entityType) => {
          const id = `${typeName}-${entityType}-${namespace}`;
          return soClient
            .delete(typeName, id)
            .then(() => logger.debug(`Deleted legacy saved object ${id}`))
            .catch((err) => {
              if (!SavedObjectsErrorHelpers.isNotFoundError(err)) throw err;
            });
        })
    )
  );
