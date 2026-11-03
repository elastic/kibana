/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Applies an incoming override layer on top of a stored one. `undefined` leaves a key alone,
 * `null` deletes it so the key falls through to the layer below.
 *
 * For writers that pass `mergeAttributes: false` the stored object is replaced wholesale, so the
 * next state has to be built here. Writers that keep the default merge can pass their block
 * straight through instead: `mergeForUpdate` recurses into nested objects and writes `null` as-is.
 */
export const applyOverrides = <Stored extends object>(
  stored: Stored | undefined,
  incoming: { [K in keyof Stored]?: Stored[K] | null } | undefined
): Stored => {
  const next = { ...(stored ?? ({} as Stored)) };
  for (const key of Object.keys(incoming ?? {}) as Array<keyof Stored>) {
    const value = incoming?.[key];
    if (value === null) {
      delete next[key];
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
};
