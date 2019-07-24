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
import { SavedObjectsClientProviderOptions } from 'src/core/server/saved_objects/service/lib/scoped_client_provider';
import { SpacesClient } from '../spaces_client';
import { Rereadable } from './rereadable_stream';
import { spaceIdToNamespace } from '../utils/namespace';

interface CopyOptions {
  objects: Array<{ type: string; id: string }>;
  overwrite: boolean;
  includeReferences: boolean;
}

interface ResolveConflictsOptions {
  objects: Array<{ type: string; id: string }>;
  includeReferences: boolean;
  retries: Array<{
    spaceId: string;
    retries: Array<{ type: string; id: string; overwrite: boolean }>;
  }>;
}

interface SpaceNotFoundError {
  type: 'space_not_found';
  spaceId: string;
}

interface UnauthorizedToManageSavedObjectsError {
  type: 'unauthorized_to_manage_saved_objects';
  spaceId: string;
}

interface CopyToSpaceError {
  error: SpaceNotFoundError | UnauthorizedToManageSavedObjectsError;
}

export interface CopyResponse {
  [spaceId: string]: {
    success: boolean;
    successCount: number;
    errors?: Array<SavedObjectsImportError | CopyToSpaceError>;
  };
}

export const COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS: SavedObjectsClientProviderOptions = {
  excludedWrappers: ['spaces'],
};

export function copySavedObjectsToSpacesFactory(
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsService: SavedObjectsService
) {
  const { importExport, types, schema } = savedObjectsService;
  const eligibleTypes = types.filter(type => !schema.isNamespaceAgnostic(type));

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

  const resolveCopySavedObjectsToSpacesConflicts = async (
    sourceSpaceId: string,
    options: ResolveConflictsOptions
  ): Promise<CopyResponse> => {
    const response: CopyResponse = {};

    const objectsStream = await exportRequestedObjects(sourceSpaceId, {
      includeReferences: options.includeReferences,
      objects: options.objects,
    });

    const rereadableStream = objectsStream.pipe(new Rereadable());

    let readStream: Readable | null = null;

    for (const entry of options.retries) {
      readStream = readStream ? rereadableStream.reread() : rereadableStream;
      const { spaceId, retries } = entry;
      response[spaceId] = await importExport.resolveImportErrors({
        readStream,
        namespace: spaceIdToNamespace(spaceId),
        objectLimit: 10000,
        retries: retries.map(retry => ({ ...retry, replaceReferences: [] })),
        savedObjectsClient,
        supportedTypes: eligibleTypes,
      });
    }

    return response;
  };

  return {
    copySavedObjectsToSpaces,
    resolveCopySavedObjectsToSpacesConflicts,
  };
}

async function canImportIntoSpace(
  spaceId: string,
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClientContract
): Promise<{ canImport: boolean; reason: undefined | CopyToSpaceError['error']['type'] }> {
  try {
    const [, canManage] = await Promise.all([
      spacesClient.get(spaceId),
      spacesClient.canManageSavedObjects(spaceId),
    ]);

    return {
      canImport: canManage,
      reason: canManage ? undefined : 'unauthorized_to_manage_saved_objects',
    };
  } catch (error) {
    const isNotFoundError = savedObjectsClient.errors.isNotFoundError(error);
    const isUnauthorizedToAccessSpaceError = error.isBoom && error.output.statusCode === 403;
    if (isNotFoundError || isUnauthorizedToAccessSpaceError) {
      return {
        canImport: false,
        reason: 'space_not_found',
      };
    }
    throw error;
  }
}
