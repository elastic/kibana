/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexMetadata } from './types';

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\?]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** Finds metadata for an index, preferring an exact key over the first matching `*` pattern. */
export function findIndexMetadata(
  name: string,
  indices: Readonly<Record<string, IndexMetadata>>
): IndexMetadata | undefined {
  if (indices[name]) {
    return indices[name];
  }
  const pattern = Object.keys(indices).find(
    (key) => key.includes('*') && patternToRegExp(key).test(name)
  );
  return pattern ? indices[pattern] : undefined;
}
