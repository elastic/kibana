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
  InferenceTracingOTLPExportConfig,
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

const otlpExportConfigSchema: Type<InferenceTracingOTLPExportConfig> = schema.object({
  url: schema.string(),
  headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  protocol: schema.oneOf([schema.literal('grpc'), schema.literal('http')], {
    defaultValue: 'http',
  }),
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
    otlp: otlpExportConfigSchema,
  }),
]);
