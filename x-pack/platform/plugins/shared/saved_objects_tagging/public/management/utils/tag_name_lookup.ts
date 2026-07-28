/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagWithRelations } from '../../../common/types';

/** Builds an id → name lookup, e.g. to resolve a merge job's `toId` to a display name. */
export const buildTagNameLookup = (tags: TagWithRelations[]) => {
  const nameById = new Map(tags.map((tag) => [tag.id, tag.name]));
  return (id: string): string | undefined => nameById.get(id);
};
