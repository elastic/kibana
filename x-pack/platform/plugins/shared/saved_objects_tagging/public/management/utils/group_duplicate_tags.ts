/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagWithRelations } from '../../../common/types';

export interface DuplicateTagGroup {
  normalizedName: string;
  tags: TagWithRelations[];
}

/** trim + lowercase: matches the case-insensitive comparison `convertTagNameToId` already uses. */
export const normalizeTagName = (name: string) => name.trim().toLowerCase();

/** Groups of 2+ tags sharing the same normalized name. */
export const groupDuplicateTagsByName = (tags: TagWithRelations[]): DuplicateTagGroup[] => {
  const byName = new Map<string, TagWithRelations[]>();
  for (const tag of tags) {
    const key = normalizeTagName(tag.name);
    const group = byName.get(key);
    if (group) {
      group.push(tag);
    } else {
      byName.set(key, [tag]);
    }
  }

  return [...byName.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([normalizedName, group]) => ({ normalizedName, tags: group }));
};
