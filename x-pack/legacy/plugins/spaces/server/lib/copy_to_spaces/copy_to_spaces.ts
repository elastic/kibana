/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsService,
  SavedObjectsImportError,
} from 'src/core/server';
import { Readable } from 'stream';
import { SavedObjectsClientProviderOptions } from 'src/core/server';
import { SpacesClient } from '../spaces_client';
import { Rereadable } from './lib/rereadable_stream';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyToSpaceError, CopyOptions } from './types';
import { canImportIntoSpace } from './lib/can_import_into_space';
import { CopyResponse } from './types';
import { getEligibleTypes } from './lib/get_eligible_types';

export const COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS: SavedObjectsClientProviderOptions = {
  excludedWrappers: ['spaces'],
};

export function copySavedObjectsToSpacesFactory(
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsService: SavedObjectsService
) {
  const { importExport, types, schema } = savedObjectsService;
  const eligibleTypes = getEligibleTypes({ types, schema });

  const createEmptyFailureResponse = (
    errors?: Array<SavedObjectsImportError | CopyToSpaceError>
  ) => ({
    success: false,
    successCount: 0,
    errors,
  });

  const exportRequestedObjects = async (
    sourceSpaceId: string,
    options: Pick<CopyOptions, 'includeReferences' | 'objects'>
  ) => {
    const objectStream = await importExport.getSortedObjectsForExport({
      namespace: spaceIdToNamespace(sourceSpaceId),
      includeReferencesDeep: options.includeReferences,
      objects: options.objects,
      savedObjectsClient,
      types: eligibleTypes,
      exportSizeLimit: 10000,
    });
    return objectStream;
  };

  const importObjectsToSpace = async (
    spaceId: string,
    objectsStream: Readable,
    options: CopyOptions
  ) => {
    try {
      const { canImport, reason } = await canImportIntoSpace(
        spaceId,
        spacesClient,
        savedObjectsClient
      );

      if (!canImport) {
        return createEmptyFailureResponse([{ error: { type: reason!, spaceId } }]);
      }

      const importResponse = await importExport.importSavedObjects({
        namespace: spaceIdToNamespace(spaceId),
        objectLimit: 10000,
        overwrite: options.overwrite,
        savedObjectsClient,
        supportedTypes: eligibleTypes,
        readStream: objectsStream,
      });

      return {
        success: importResponse.success,
        successCount: importResponse.successCount,
        errors: importResponse.errors,
      };
    } catch (error) {
      return createEmptyFailureResponse([error]);
    }
  };

  const copySavedObjectsToSpaces = async (
    sourceSpaceId: string,
    destinationSpaceIds: string[],
    options: CopyOptions
  ): Promise<CopyResponse> => {
    const response: CopyResponse = {};

    const objectsStream = await exportRequestedObjects(sourceSpaceId, options);
    const rereadableStream = objectsStream.pipe(new Rereadable());

    let readStream: Readable | null = null;
    for (const spaceId of destinationSpaceIds) {
      readStream = readStream ? rereadableStream.reread() : rereadableStream;
      response[spaceId] = await importObjectsToSpace(spaceId, readStream, options);
    }

    return response;
  };

  return copySavedObjectsToSpaces;
}
