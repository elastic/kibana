/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  schema: schema.object({
    enabled: schema.boolean(),
    registryUrl: schema.string(),
  }),
};

export type IntegrationsManagerConfig = TypeOf<typeof config.schema>;
