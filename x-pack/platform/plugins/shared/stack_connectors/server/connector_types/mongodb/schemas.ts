/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/** Connector type id for MongoDB */
export const CONNECTOR_ID = '.mongodb';

/** Display name for the MongoDB connector */
export const CONNECTOR_NAME = 'MongoDB';

/** Sub-action names */
export const SUB_ACTION = {
  TEST: 'test',
  LIST_COLLECTIONS: 'listCollections',
  FIND: 'find',
  AGGREGATE: 'aggregate',
} as const;

/** Schema for MongoDB connector configuration. database is the database this connector is bound to. */
export const MongoConnectorConfigSchema = z
  .object({
    database: z.string().min(1),
  })
  .strict();

/**
 * Schema for MongoDB connector secrets.
 * connectionUri must be a valid MongoDB connection string (e.g. mongodb://host:27017 or mongodb+srv://...).
 */
export const MongoConnectorSecretsSchema = z.object({
  connectionUri: z.string().min(1),
});

export type MongoConnectorConfig = z.infer<typeof MongoConnectorConfigSchema>;
export type MongoConnectorSecrets = z.infer<typeof MongoConnectorSecretsSchema>;

// Sub-action param schemas

export const TestConnectorRequestSchema = z.object({}).strict();

export const ListCollectionsRequestSchema = z.object({
  nameOnly: z.boolean().optional(),
});

export const FindRequestSchema = z.object({
  collection: z.string().min(1),
  filter: z.record(z.string(), z.unknown()).optional(),
  limit: z.number().int().min(1).max(10000).optional(),
  skip: z.number().int().min(0).optional(),
  sort: z.record(z.string(), z.union([z.literal(1), z.literal(-1)])).optional(),
});

export const AggregateRequestSchema = z.object({
  collection: z.string().min(1),
  pipeline: z.array(z.record(z.string(), z.unknown())).min(1),
});
