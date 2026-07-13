/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsBulkUpdateObject,
  ISavedObjectTypeRegistry,
  SavedObject,
} from '@kbn/core/server';
import { tagIdToReference, updateTagReferences } from '../../../common/references';
import type { MergeAffectedObject } from '../../../common/merge';

/**
 * Count of objects, per taggable type, that reference any of `fromIds` (OR). The overall
 * affected count is the sum across types, since every saved object has exactly one type.
 *
 * Plain function (no request/auth context needed): shared as-is by the preview route (using a
 * per-user-scoped client) and the `tag_merge` Task Manager runner (using the job's own
 * user-scoped client), so the "affected objects" definition can't drift between the two.
 */
export const computeAffectedCount = async (
  client: SavedObjectsClientContract,
  { fromIds, types }: { fromIds: string[]; types: string[] }
): Promise<{ affectedCount: number; byType: Record<string, number> }> => {
  const hasReference = fromIds.map(tagIdToReference);

  const byType: Record<string, number> = {};
  await Promise.all(
    types.map(async (type) => {
      const { total } = await client.find({
        type,
        hasReference,
        hasReferenceOperator: 'OR',
        perPage: 0,
      });
      byType[type] = total;
    })
  );

  const affectedCount = Object.values(byType).reduce((sum, count) => sum + count, 0);
  return { affectedCount, byType };
};

/** Paginated listing of objects referencing any of `fromIds` (OR), across `types`. */
export const findAffectedObjects = async (
  client: SavedObjectsClientContract,
  typeRegistry: ISavedObjectTypeRegistry,
  {
    fromIds,
    types,
    page,
    perPage,
  }: { fromIds: string[]; types: string[]; page: number; perPage: number }
): Promise<{ objects: MergeAffectedObject[]; total: number }> => {
  const { saved_objects: objects, total } = await client.find({
    type: types,
    hasReference: fromIds.map(tagIdToReference),
    hasReferenceOperator: 'OR',
    page,
    perPage,
  });

  return {
    total,
    objects: objects.map((object) => ({
      type: object.type,
      id: object.id,
      title: typeRegistry.getType(object.type)?.management?.getTitle?.(object),
    })),
  };
};

/** Rewrite `fromIds` tag references to `toId` on the given objects, deduping per object. */
export const rewriteTagReferences = (
  objects: Array<Pick<SavedObject, 'id' | 'type' | 'references'>>,
  { toId, fromIds }: { toId: string; fromIds: string[] }
): SavedObjectsBulkUpdateObject[] =>
  objects.map((object) => ({
    id: object.id,
    type: object.type,
    // partial update: empty attributes leaves attributes untouched, only references change.
    attributes: {},
    references: updateTagReferences({
      references: object.references,
      toAdd: [toId],
      toRemove: fromIds,
    }),
  }));
