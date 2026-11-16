/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Legacy `config.ingestTokenHash`. Nothing reads it. Hide it from connector HTTP responses. */
export const omitIngestTokenHashFromConfig = (
  config?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (config === undefined) {
    return undefined;
  }
  const { ingestTokenHash: _omit, ...rest } = config;
  return rest;
};
