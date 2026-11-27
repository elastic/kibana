/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-api-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import type { ApplyError, RemoveResult, ResourceOwnership, StoredVersion } from './types';

const NOT_FOUND = 404;

/**
 * `fields` for reading a saved object without its attributes: an empty list reads the whole object,
 * while a name that matches none reads only the root fields, such as `namespaces` and `updated_at`.
 */
export const NO_ATTRIBUTES: string[] = ['__none'];

export interface SavedObjectRef {
  type: string;
  id: string;
}

/**
 * Returns the stored version, `updated_at` and spaces of each object that exists, without its
 * attributes; ones not found are left out, and any other error throws, since an object that cannot
 * be read must not pass for one that is gone. A shareable object is looked up in every space, since
 * it may live in other spaces than the client's.
 */
export const readSavedObjectVersions = async ({
  client,
  objects,
  shareable,
}: {
  client: SavedObjectsClientContract;
  objects: SavedObjectRef[];
  shareable: boolean;
}): Promise<Array<SavedObjectRef & StoredVersion & { namespaces?: string[] }>> => {
  if (objects.length === 0) {
    return [];
  }
  const { saved_objects: found } = await client.bulkGet(
    objects.map(({ type, id }) => ({
      type,
      id,
      fields: NO_ATTRIBUTES,
      ...(shareable && { namespaces: [ALL_NAMESPACES_STRING] }),
    }))
  );
  for (const object of found) {
    if (isSavedObjectErrorResult(object) && object.error.statusCode !== NOT_FOUND) {
      throw new Error(`Could not read ${object.type} "${object.id}": ${object.error.message}`);
    }
  }
  return found.flatMap((object) =>
    isSavedObjectErrorResult(object) || object.version === undefined
      ? []
      : [
          {
            type: object.type,
            id: object.id,
            version: object.version,
            ...(object.updated_at !== undefined && { updatedAt: object.updated_at }),
            ...(object.namespaces !== undefined && { namespaces: object.namespaces }),
          },
        ]
  );
};

/**
 * Groups the ids by a space each object is in, `spaceId` while it is still there: a client finds a
 * shared object only through one of its spaces, and the space it is owned in may have been deleted
 * since. Ids of objects not found stay with `spaceId`.
 */
const groupBySpaceItIsIn = (
  spaceId: string,
  ids: string[],
  found: ReadonlyArray<{ id: string; namespaces?: string[] }>
): Map<string, string[]> => {
  const namespacesById = new Map(found.map(({ id, namespaces = [] }) => [id, namespaces]));
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const namespaces = namespacesById.get(id) ?? [];
    const scope =
      namespaces.length === 0 ||
      namespaces.includes(spaceId) ||
      namespaces.includes(ALL_NAMESPACES_STRING)
        ? spaceId
        : namespaces[0];
    groups.set(scope, [...(groups.get(scope) ?? []), id]);
  }
  return groups;
};

/** Deletes the objects from every space they are in; ones already gone are not errors. */
export const removeSavedObjects = async ({
  client,
  objects,
}: {
  client: SavedObjectsClientContract;
  objects: SavedObjectRef[];
}): Promise<{ removed: number; errors: Array<SavedObjectRef & { message: string }> }> => {
  const result = { removed: 0, errors: [] as Array<SavedObjectRef & { message: string }> };
  if (objects.length === 0) {
    return result;
  }
  const { statuses } = await client.bulkDelete(objects, { force: true });
  for (const { type, id, success, error } of statuses) {
    if (success) {
      result.removed++;
    } else if (error?.statusCode !== NOT_FOUND) {
      result.errors.push({ type, id, message: error?.message ?? 'Unknown error' });
    }
  }
  return result;
};

/**
 * Ownership for a kind that stores each resource as a saved object of one `type` whose id names the
 * same object in every space: a type that is not single-space. `getClient` returns a client scoped
 * to a space. `shareable` says whether the type can live in several spaces: only then can its
 * objects be looked up in every space, so a space-isolated type is looked up in the declared space.
 * `getLookupClient`, when given, returns the client a shareable type is looked up in every space
 * through, such as an internal client without the spaces extension, whose check of the spaces
 * needs a user request. A kind can still give its own `remove`.
 */
export const createSavedObjectOwnership = ({
  type,
  shareable,
  getClient,
  getLookupClient,
}: {
  type: string;
  shareable: boolean;
  getClient: (spaceId: string) => Promise<SavedObjectsClientContract>;
  getLookupClient?: () => Promise<SavedObjectsClientContract>;
}): Required<ResourceOwnership> => {
  const toObjects = (ids: string[]): SavedObjectRef[] => ids.map((id) => ({ type, id }));
  const readVersions = async (client: SavedObjectsClientContract, ids: string[]) =>
    readSavedObjectVersions({
      client: shareable && getLookupClient ? await getLookupClient() : client,
      objects: toObjects(ids),
      shareable,
    });

  return {
    versions: async ({ spaceId, ids, signal }) => {
      signal.throwIfAborted();
      const found = await readVersions(await getClient(spaceId), ids);
      return Object.fromEntries(
        found.map(({ id, version, updatedAt }) => [
          id,
          { version, ...(updatedAt !== undefined && { updatedAt }) },
        ])
      );
    },
    remove: async ({ spaceId, ids, signal }): Promise<RemoveResult> => {
      signal.throwIfAborted();
      const client = await getClient(spaceId);
      const scopes = shareable
        ? groupBySpaceItIsIn(spaceId, ids, await readVersions(client, ids))
        : new Map([[spaceId, ids]]);

      const result = { removed: 0, errors: [] as ApplyError[] };
      for (const [scope, scopedIds] of scopes) {
        signal.throwIfAborted();
        const { removed, errors } = await removeSavedObjects({
          client: scope === spaceId ? client : await getClient(scope),
          objects: toObjects(scopedIds),
        });
        result.removed += removed;
        result.errors.push(...errors.map(({ id, message }): ApplyError => ({ id, message })));
      }
      return result;
    },
  };
};
