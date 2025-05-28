/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const scheduledDelay = schema.conditional(
  schema.contextRef('dev'),
  true,
  schema.number({ defaultValue: 1000 }),
  schema.number({ defaultValue: 5000 })
);

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  tracing: schema.maybe(
    schema.object({
      exporter: schema.maybe(
        schema.oneOf([
          schema.object({
            langfuse: schema.object({
              base_url: schema.uri(),
              public_key: schema.string(),
              secret_key: schema.string(),
              scheduled_delay: scheduledDelay,
            }),
          }),
          schema.object({
            phoenix: schema.object({
              base_url: schema.string(),
              public_url: schema.maybe(schema.uri()),
              project_name: schema.maybe(schema.string()),
              api_key: schema.maybe(schema.string()),
              scheduled_delay: scheduledDelay,
            }),
          }),
        ])
      ),
    })
  ),
});

export type InferenceConfig = TypeOf<typeof configSchema>;
