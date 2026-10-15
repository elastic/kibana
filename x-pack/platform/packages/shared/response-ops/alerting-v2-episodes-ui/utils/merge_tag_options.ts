/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mergeTagOptions = (tagLists: Array<string | undefined>): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const tag of tagLists) {
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }

  return merged;
};
