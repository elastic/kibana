/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  slack: schema.maybe(
    schema.object({
      client_id: schema.string(),
      redirect_uri: schema.maybe(schema.string()), // defaults to connect.elastic.co
    })
  ),
});

export type ElasticConsoleConfig = TypeOf<typeof configSchema>;
