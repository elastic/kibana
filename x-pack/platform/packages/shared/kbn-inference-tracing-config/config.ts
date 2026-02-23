/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type {
  InferenceTracingExportConfig,
  InferenceTracingLangfuseExportConfig,
  InferenceTracingPhoenixExportConfig,
  InferenceTracingElasticsearchExportConfig,
} from './types';

const scheduledDelay = schema.conditional(
  schema.contextRef('dev'),
  true,
  schema.number({ defaultValue: 1000 }),
  schema.number({ defaultValue: 5000 })
);

const langfuseExportConfigSchema: Type<InferenceTracingLangfuseExportConfig> = schema.object({
  base_url: schema.uri(),
  public_key: schema.string(),
  secret_key: schema.string(),
  scheduled_delay: scheduledDelay,
});

const phoenixExportConfigSchema: Type<InferenceTracingPhoenixExportConfig> = schema.object({
  base_url: schema.string(),
  public_url: schema.maybe(schema.uri()),
  project_name: schema.maybe(schema.string()),
  api_key: schema.maybe(schema.string()),
  scheduled_delay: scheduledDelay,
});

const elasticsearchExportConfigSchema: Type<InferenceTracingElasticsearchExportConfig> =
  schema.object({
    cluster_url: schema.uri(),
    api_key: schema.maybe(schema.string()),
    username: schema.maybe(schema.string()),
    password: schema.maybe(schema.string()),
    index_name: schema.maybe(schema.string({ defaultValue: 'inference-traces' })),
    scheduled_delay: scheduledDelay,
  });

export const inferenceTracingExportConfigSchema: Type<InferenceTracingExportConfig> = schema.oneOf([
  schema.object({
    langfuse: langfuseExportConfigSchema,
  }),
  schema.object({
    phoenix: phoenixExportConfigSchema,
  }),
  schema.object({
    elasticsearch: elasticsearchExportConfigSchema,
  }),
]);
