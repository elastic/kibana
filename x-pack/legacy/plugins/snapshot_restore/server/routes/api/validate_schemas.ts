/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const nameParameterSchema = schema.object({
  name: schema.string(),
});

// Repositories
const fsRepositorySchema = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.object({
    location: schema.string(),
    compress: schema.maybe(schema.boolean()),
    chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
    maxRestoreBytesPerSec: schema.maybe(schema.string()),
    maxSnapshotBytesPerSec: schema.maybe(schema.string()),
    readonly: schema.maybe(schema.boolean()),
  }),
});

export const repositorySchema = schema.oneOf([fsRepositorySchema]);
