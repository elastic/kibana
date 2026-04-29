/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  /** Base URL of the pipelines-config service (e.g. http://pipelines-config:8080). */
  pipelinesConfigEndpoint: schema.string({ defaultValue: 'http://localhost:18081' }),
  /** Tenant identity — set in kibana.yml per deployment. */
  targetType: schema.string({ defaultValue: '' }),
  targetId: schema.string({ defaultValue: '' }),
});

export type CloudPipelinesConfig = TypeOf<typeof configSchema>;

export const config = {
  schema: configSchema,
};
