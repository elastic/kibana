/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsImportFailure,
} from '@kbn/core/server';
import type {
  AccessControlImportTransforms,
  AccessControlImportTransformsFactory,
} from '@kbn/core-saved-objects-server';
import { createFilterStream, createMapStream } from '@kbn/utils';

export function getImportTransformsFactory(): AccessControlImportTransformsFactory {
  return (
    typeRegistry: ISavedObjectTypeRegistry,
    errors: SavedObjectsImportFailure[]
  ): AccessControlImportTransforms => {
    const filterStream = createFilterStream<SavedObject<{ title: string }>>((obj) => {
      const typeSupportsAccessControl = typeRegistry.supportsAccessControl(obj.type);
      const { title } = obj.attributes;

      // In phase 1, these checks are irrelevent. We strip the incoming metadata to apply the default behavior of bulk_create.
      // In phase 2, we will need to make these checks in order to validate when an Admin chooses to apply access control on import.
      // GH Issue: https://github.com/elastic/kibana/issues/242671

      // if (typeSupportsAccessControl && obj.accessControl && !obj.accessControl.accessMode) {
      //   errors.push({
      //     id: obj.id,
      //     type: obj.type,
      //     meta: { title },
      //     error: {
      //       type: 'missing_access_control_mode_metadata',
      //     },
      //   });
      //   return false;
      // }

      // if (
      //   typeSupportsAccessControl &&
      //   obj.accessControl &&
      //   (!obj.accessControl.owner || obj.accessControl.owner.trim().length === 0)
      // ) {
      //   errors.push({
      //     id: obj.id,
      //     type: obj.type,
      //     meta: { title },
      //     error: {
      //       type: 'missing_access_control_owner_metadata',
      //     },
      //   });
      //   return false;
      // }

      if (!typeSupportsAccessControl && obj.accessControl) {
        errors.push({
          id: obj.id,
          type: obj.type,
          meta: { title },
          error: {
            type: 'unexpected_access_control_metadata',
          },
        });
        return false;
      }

      return true;
    });

    // This is needed to strip incoming access control metadata, phase 1 for all users
    // phase 2 for non-Admin users, and for admin users who are not applying access control on import
    const mapStream = createMapStream((obj: SavedObject) => {
      const typeSupportsAccessControl = typeRegistry.supportsAccessControl(obj.type);

      if (typeSupportsAccessControl && obj.accessControl) {
        delete obj.accessControl;
      }
      return {
        ...obj,
      };
    });

    return { filterStream, mapStream };
  };
}
