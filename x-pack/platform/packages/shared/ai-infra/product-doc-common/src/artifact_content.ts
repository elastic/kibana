/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const contentFileRegexp = /^content\/content-[0-9]+\.ndjson$/;

export const isArtifactContentFilePath = (path: string): boolean => {
  return contentFileRegexp.test(path);
};
