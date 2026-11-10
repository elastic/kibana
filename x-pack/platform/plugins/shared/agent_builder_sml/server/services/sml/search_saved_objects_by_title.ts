/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

// How many of the most recent titles are read to find those starting with punctuation.
const PUNCTUATION_SCAN_SIZE = 500;

/** Looks saved objects of a type up by the start of their title, most recently updated first. */
export const searchSavedObjectsByTitle = async ({
  type,
  title,
  size,
  savedObjectsClient,
}: {
  type: string;
  title: string;
  size: number;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<Array<{ originId: string; title: string }>> => {
  // Drop the operators of the `simple_query_string` search, so typed text is matched literally.
  const term = title
    .replace(/[+|\-"*()~\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // The search matches words, so text without any, such as the `[` that starts many titles, can't
  // be searched: read the most recent titles instead and keep those that start with the text.
  const typed = title.trim();
  const isPunctuationOnly = typed !== '' && !/[\p{L}\p{N}]/u.test(typed);
  const { saved_objects: found } = await savedObjectsClient.find<{ title?: string }>({
    type,
    fields: ['title'],
    perPage: isPunctuationOnly ? PUNCTUATION_SCAN_SIZE : size,
    sort: [{ field: 'updated_at', order: 'desc' }],
    ...(term && !isPunctuationOnly
      ? { search: `${term}*`, searchFields: ['title'], defaultSearchOperator: 'AND' as const }
      : {}),
  });
  const savedObjects = isPunctuationOnly
    ? found
        .filter(({ attributes }) => attributes.title?.toLowerCase().startsWith(typed.toLowerCase()))
        .slice(0, size)
    : found;
  return savedObjects.map(({ id, attributes }) => ({
    originId: id,
    title: attributes.title ?? id,
  }));
};
