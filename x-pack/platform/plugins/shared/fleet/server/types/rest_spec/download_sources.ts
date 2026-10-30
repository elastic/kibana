/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { DownloadSourceSchema } from '../models';

export const GetOneDownloadSourcesRequestSchema = {
  params: schema.object({
    sourceId: schema.savedObjectId.warn({
      minLength: 0,
      label: 'fleet.download_sources.get.sourceId',
      meta: { description: 'The ID of the download source' },
    }),
  }),
};

export const getDownloadSourcesRequestSchema = {};

export const PostDownloadSourcesRequestSchema = {
  body: DownloadSourceSchema,
};

export const PutDownloadSourcesRequestSchema = {
  params: schema.object({
    sourceId: schema.savedObjectId.warn({
      minLength: 0,
      label: 'fleet.download_sources.update.sourceId',
      meta: { description: 'The ID of the download source' },
    }),
  }),
  body: DownloadSourceSchema,
};

export const DeleteDownloadSourcesRequestSchema = {
  params: schema.object({
    sourceId: schema.savedObjectId.warn({
      minLength: 0,
      label: 'fleet.download_sources.delete.sourceId',
      meta: { description: 'The ID of the download source' },
    }),
  }),
};

export const DeleteDownloadSourcesResponseSchema = schema.object({
  id: schema.string(),
});
