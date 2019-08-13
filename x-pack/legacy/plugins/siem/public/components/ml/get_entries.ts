/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getEntries = (
  entityOrInfluencer: Record<string, string>
): [string, string] | [null, null] => {
  const entries = Object.entries(entityOrInfluencer);
  if (Array.isArray(entries[0])) {
    const [[key, value]] = entries;
    return [key, value];
  } else {
    return [null, null];
  }
};
