/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const nameParameterSchema = schema.object({
  name: schema.string(),
});

const snapshotConfigSchema = schema.object({
  indices: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  ignoreUnavailable: schema.maybe(schema.boolean()),
  includeGlobalState: schema.maybe(schema.boolean()),
  featureStates: schema.maybe(schema.arrayOf(schema.string())),
  partial: schema.maybe(schema.boolean()),
  metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
});

const snapshotRetentionSchema = schema.object({
  expireAfterValue: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
  expireAfterUnit: schema.maybe(schema.string()),
  maxCount: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
  minCount: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
});

export const snapshotListSchema = schema.object({
  sortField: schema.oneOf([
    schema.literal('snapshot'),
    schema.literal('repository'),
    schema.literal('indices'),
    schema.literal('durationInMillis'),
    schema.literal('startTimeInMillis'),
    schema.literal('shards.total'),
    schema.literal('shards.failed'),
  ]),
  sortDirection: schema.oneOf([schema.literal('desc'), schema.literal('asc')]),
  pageIndex: schema.number(),
  pageSize: schema.number(),
  searchField: schema.maybe(
    schema.oneOf([
      schema.literal('snapshot'),
      schema.literal('repository'),
      schema.literal('policyName'),
    ])
  ),
  searchValue: schema.maybe(schema.string()),
  searchMatch: schema.maybe(schema.oneOf([schema.literal('must'), schema.literal('must_not')])),
  searchOperator: schema.maybe(schema.oneOf([schema.literal('eq'), schema.literal('exact')])),
});

export const policySchema = schema.object({
  name: schema.string({ maxLength: 1000 }),
  snapshotName: schema.string({ maxLength: 1000 }),
  schedule: schema.string(),
  repository: schema.string(),
  config: schema.maybe(snapshotConfigSchema),
  retention: schema.maybe(snapshotRetentionSchema),
  isManagedPolicy: schema.boolean(),
});

// Only validate required settings, everything else is optional
const fsRepositorySettings = schema.object({ location: schema.string() }, { unknowns: 'allow' });

const readOnlyRepositorySettings = schema.object({
  url: schema.string(),
});

// Only validate required settings, everything else is optional
const s3RepositorySettings = schema.object({ bucket: schema.string() }, { unknowns: 'allow' });

// Only validate required settings, everything else is optional
const hdsRepositorySettings = schema.object(
  {
    uri: schema.string(),
    path: schema.string(),
  },
  { unknowns: 'allow' }
);

const azureRepositorySettings = schema.object({}, { unknowns: 'allow' });

// Only validate required settings, everything else is optional
const gcsRepositorySettings = schema.object({ bucket: schema.string() }, { unknowns: 'allow' });

const sourceRepositorySettings = schema.oneOf([
  fsRepositorySettings,
  readOnlyRepositorySettings,
  s3RepositorySettings,
  hdsRepositorySettings,
  azureRepositorySettings,
  gcsRepositorySettings,
  schema.object(
    {
      delegateType: schema.string(),
    },
    { unknowns: 'allow' }
  ),
]);

export const repositorySchema = schema.object({
  name: schema.string({ maxLength: 1000 }),
  type: schema.string(),
  settings: schema.oneOf([
    fsRepositorySettings,
    readOnlyRepositorySettings,
    s3RepositorySettings,
    hdsRepositorySettings,
    azureRepositorySettings,
    gcsRepositorySettings,
    sourceRepositorySettings,
  ]),
});

export const restoreSettingsSchema = schema.object({
  indices: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  renamePattern: schema.maybe(schema.string()),
  renameReplacement: schema.maybe(schema.string()),
  includeGlobalState: schema.maybe(schema.boolean()),
  featureStates: schema.maybe(schema.arrayOf(schema.string())),
  partial: schema.maybe(schema.boolean()),
  indexSettings: schema.maybe(schema.string()),
  ignoreIndexSettings: schema.maybe(schema.arrayOf(schema.string())),
  ignoreUnavailable: schema.maybe(schema.boolean()),
  includeAliases: schema.maybe(schema.boolean()),
});
