/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  ISavedObjectTypeRegistry,
  KibanaRequest,
  SavedObject,
  SavedObjectsExportTransform,
  SavedObjectsExportTransformContext,
  SavedObjectsImportFailure,
} from '@kbn/core/server';
import type {
  AccessControlImportTransforms,
  AccessControlImportTransformsFactory,
} from '@kbn/core-saved-objects-server';
import { createFilterStream } from '@kbn/utils';

export const exportTransform: SavedObjectsExportTransform = (
  context: SavedObjectsExportTransformContext,
  objects: Array<SavedObject<unknown>>
) => {
  return objects.map<SavedObject<unknown>>(({ accessControl, ...object }) => {
    if (!accessControl) return object;
    return { ...object, accessControl: { ...accessControl, owner: '' } };
  });
};

export function getImportTransformsFactory(
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null
): AccessControlImportTransformsFactory {
  return (
    request: KibanaRequest,
    typeRegistry: ISavedObjectTypeRegistry,
    errors: SavedObjectsImportFailure[]
  ): AccessControlImportTransforms => {
    const filterStream = createFilterStream<SavedObject<{ title: string }>>((obj) => {
      const profileId = getCurrentUser(request)?.profile_uid;
      const typeSupportsAccessControl = typeRegistry.supportsAccessControl(obj.type);
      const { title } = obj.attributes;

      // Require at least the mode, or nothing at all
      if (typeSupportsAccessControl && obj.accessControl && !obj.accessControl.accessMode) {
        errors.push({
          id: obj.id,
          type: obj.type,
          meta: { title },
          error: {
            type: 'missing_access_control_metadata',
          },
        });
        return false;
      }

      if (
        typeSupportsAccessControl &&
        obj.accessControl &&
        (!profileId || profileId.trim() === '')
      ) {
        errors.push({
          id: obj.id,
          type: obj.type,
          meta: { title },
          error: {
            type: 'requires_profile_id',
          },
        });
        return false;
      }

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

    // This is not needed, as the owner is set during the bulk create operation
    // const mapStream = createMapStream((obj: SavedObject) => {
    //   const profileId = getCurrentUser(request)?.profile_uid;
    //   if (obj.accessControl) {
    //     const test = {
    //       ...obj,
    //       ...(obj.accessControl &&
    //         profileId && { accessControl: { ...obj.accessControl, owner: profileId } }),
    //     };
    //   }
    //   return {
    //     ...obj,
    //     ...(obj.accessControl &&
    //       profileId && { accessControl: { ...obj.accessControl, owner: profileId } }),
    //   };
    // });

    return { filterStream };
  };
}
