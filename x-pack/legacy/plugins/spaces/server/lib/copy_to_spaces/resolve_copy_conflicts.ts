/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsService } from 'src/core/server';
import { Readable } from 'stream';
import { SpacesClient } from '../spaces_client';
import { Rereadable } from './lib/rereadable_stream';
import { spaceIdToNamespace } from '../utils/namespace';
import { CopyOptions, ResolveConflictsOptions, CopyResponse } from './types';
import { canImportIntoSpace } from './lib/can_import_into_space';
import { getEligibleTypes } from './lib/get_eligible_types';
import { createEmptyFailureResponse } from './lib/create_empty_failure_response';

export function resolveCopySavedObjectsToSpacesConflictsFactory(
  spacesClient: SpacesClient,
  savedObjectsClient: SavedObjectsClientContract,
  savedObjectsService: SavedObjectsService
) {
  const { importExport, types, schema } = savedObjectsService;
  const eligibleTypes = getEligibleTypes({ types, schema });

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

  const resolveConflictsForSpace = async (
    spaceId: string,
    objectsStream: Readable,
    retries: Array<{
      type: string;
      id: string;
      overwrite: boolean;
      replaceReferences: Array<{ type: string; from: string; to: string }>;
    }>
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

      const importResponse = await importExport.resolveImportErrors({
        namespace: spaceIdToNamespace(spaceId),
        objectLimit: 10000,
        savedObjectsClient,
        supportedTypes: eligibleTypes,
        readStream: objectsStream,
        retries,
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
      const { space, retries: entryRetries } = entry;

      const retries = entryRetries.map(retry => ({ ...retry, replaceReferences: [] }));

      response[space] = await resolveConflictsForSpace(space, readStream, retries);
    }

    return response;
  };

  return resolveCopySavedObjectsToSpacesConflicts;
}
