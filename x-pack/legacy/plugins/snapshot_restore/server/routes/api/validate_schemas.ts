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

const readOnlyRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.object({
    url: schema.string(),
  }),
});

const s3repository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.object({
    bucket: schema.string(),
    client: schema.maybe(schema.string()),
    basePath: schema.maybe(schema.string()),
    compress: schema.maybe(schema.boolean()),
    chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
    serverSideEncryption: schema.maybe(schema.boolean()),
    bufferSize: schema.maybe(schema.string()),
    cannedAcl: schema.maybe(schema.string()),
    storageClass: schema.maybe(schema.string()),
    maxRestoreBytesPerSec: schema.maybe(schema.string()),
    maxSnapshotBytesPerSec: schema.maybe(schema.string()),
    readonly: schema.maybe(schema.boolean()),
  }),
});

const hdsfRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.oneOf([
    schema.object({
      uri: schema.string(),
      path: schema.string(),
      loadDefaults: schema.maybe(schema.boolean()),
      compress: schema.maybe(schema.boolean()),
      chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
      maxRestoreBytesPerSec: schema.maybe(schema.string()),
      maxSnapshotBytesPerSec: schema.maybe(schema.string()),
      readonly: schema.maybe(schema.boolean()),
      ['security.principal']: schema.maybe(schema.string()),
    }),
    schema.recordOf(schema.string(), schema.any()), // For conf.* settings
  ]),
});

const azureRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.object({
    client: schema.maybe(schema.string()),
    container: schema.maybe(schema.string()),
    basePath: schema.maybe(schema.string()),
    locationMode: schema.maybe(schema.string()),
    compress: schema.maybe(schema.boolean()),
    chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
    maxRestoreBytesPerSec: schema.maybe(schema.string()),
    maxSnapshotBytesPerSec: schema.maybe(schema.string()),
    readonly: schema.maybe(schema.boolean()),
  }),
});

const gcsRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.object({
    bucket: schema.string(),
    client: schema.maybe(schema.string()),
    basePath: schema.maybe(schema.string()),
    compress: schema.maybe(schema.boolean()),
    chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
    maxRestoreBytesPerSec: schema.maybe(schema.string()),
    maxSnapshotBytesPerSec: schema.maybe(schema.string()),
    readonly: schema.maybe(schema.boolean()),
  }),
});

export const repositorySchema = schema.oneOf([
  fsRepositorySchema,
  readOnlyRepository,
  s3repository,
  hdsfRepository,
  azureRepository,
  gcsRepository,
]);
