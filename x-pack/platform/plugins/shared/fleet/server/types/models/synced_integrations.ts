/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const RemoteSyncedIntegrationsBaseSchema = schema.object({
  id: schema.maybe(schema.string()),
  name: schema.maybe(schema.string()),
  version: schema.maybe(schema.string()),
});

export const GetRemoteSyncedIntegrationsStatusResponseSchema = schema.object({
  items: RemoteSyncedIntegrationsBaseSchema.extends({
    sync_status: schema.boolean(),
    error: schema.maybe(schema.string()),
  }),
});
