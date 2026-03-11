/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { getUserInfo } from '../../lib/get_user_info';
import { generateCopyName } from './generate_copy_name';

interface CopySavedObjectSourceOptions<T> {
  /** The saved-object type (e.g. packSavedObjectType) */
  type: string;
  /** Logger name passed to osqueryContext.logFactory.get() */
  loggerName: string;
  /** Extract the "name" field from the source SO attributes for collision detection */
  getNameFromAttributes: (attributes: T) => string;
}

export interface CopySavedObjectContext<T> {
  /** The space-scoped saved objects client */
  client: SavedObjectsClientContract;
  /** Attributes of the source saved object */
  sourceAttributes: T;
  /** References from the source saved object */
  sourceReferences: Array<{ name: string; type: string; id: string }>;
  /** Generated unique copy name */
  newName: string;
  /** Current username or undefined */
  username: string | undefined;
  /** ISO timestamp for created_at / updated_at */
  now: string;
}

/**
 * Shared logic for copying a saved object: fetch source, resolve the user,
 * generate a collision-free name. Returns the context needed for the caller
 * to create the new object with its domain-specific attributes.
 *
 * Returns `null` if the source could not be found — callers should return
 * `response.notFound()` in that case.
 */
export async function prepareSavedObjectCopy<T>(
  osqueryContext: OsqueryAppContext,
  request: KibanaRequest<{ id: string }>,
  options: CopySavedObjectSourceOptions<T>
): Promise<CopySavedObjectContext<T> | null> {
  const client = await createInternalSavedObjectsClientForSpaceId(osqueryContext, request);

  let sourceSO;
  try {
    sourceSO = await client.get<T>(options.type, request.params.id);
  } catch (err) {
    return null;
  }

  const currentUser = await getUserInfo({
    request,
    security: osqueryContext.security,
    logger: osqueryContext.logFactory.get(options.loggerName),
  });
  const username = currentUser?.username ?? undefined;

  // Find existing names for collision resolution.
  // Fetch all entries and filter in memory because KQL does not support
  // wildcards inside quoted values, which caused duplicate names.
  const baseName = options.getNameFromAttributes(sourceSO.attributes);
  const existingEntries = await client.find<T>({
    type: options.type,
    perPage: 1000,
  });
  const existingNames = existingEntries.saved_objects.map((so) =>
    options.getNameFromAttributes(so.attributes)
  );

  const newName = generateCopyName(baseName, existingNames);
  const now = new Date().toISOString();

  return {
    client,
    sourceAttributes: sourceSO.attributes,
    sourceReferences: sourceSO.references,
    newName,
    username,
    now,
  };
}
