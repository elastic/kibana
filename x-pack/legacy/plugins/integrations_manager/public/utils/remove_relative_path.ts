/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const removeRelativePath = (relativePath: string): string | null => {
  const path = /(\.*\/)*(.*)/.exec(relativePath);
  if (path) {
    return path[2];
  }
  return null;
};
