/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offeringBasedSchema, schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object(
  {
    enableManageProcessors: offeringBasedSchema({
      // Manage processors UI is disabled in serverless; refer to the serverless.yml file as the source of truth
      // We take this approach in order to have a central place (serverless.yml) for serverless config across Kibana
      serverless: schema.boolean({ defaultValue: true }),
    }),
  },
  { defaultValue: undefined }
);

export type IngestPipelinesConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<IngestPipelinesConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    enableManageProcessors: true,
  },
};
