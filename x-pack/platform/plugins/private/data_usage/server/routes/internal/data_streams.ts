/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { DATA_USAGE_DATA_STREAMS_API_ROUTE } from '../../../common';
import type { DataUsageContext, DataUsageRouter } from '../../types';
import { getDataStreamsHandler } from './data_streams_handler';

export const registerDataStreamsRoute = (
  router: DataUsageRouter,
  dataUsageContext: DataUsageContext
) => {
  router.versioned
    .get({
      access: 'internal',
      path: DATA_USAGE_DATA_STREAMS_API_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to scoped ES client',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: DataStreamsRequestSchema,
          response: {
            200: DataStreamsResponseSchema,
          },
        },
      },
      getDataStreamsHandler(dataUsageContext)
    );
};

export const DataStreamsRequestSchema = {
  query: schema.object({
    includeZeroStorage: schema.boolean({ defaultValue: false }),
  }),
};

export type DataStreamsRequestQuery = TypeOf<typeof DataStreamsRequestSchema.query>;

export const DataStreamsResponseSchema = {
  body: () =>
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        storageSizeBytes: schema.number(),
      }),
      { maxSize: 1000 }
    ),
};

export type DataStreamsResponseBodySchemaBody = TypeOf<typeof DataStreamsResponseSchema.body>;
