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
  InferenceTracingAgentBuilderExportConfig,
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

const agentBuilderExportConfigSchema: Type<InferenceTracingAgentBuilderExportConfig> =
  schema.object(
    {
      send_to_self: schema.boolean({ defaultValue: true }),
      url: schema.maybe(schema.string()),
      headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
      force_sample: schema.boolean({ defaultValue: true }),
      scheduled_delay: scheduledDelay,
    },
    {
      validate: (value) => {
        if (value.send_to_self) {
          if (value.url) {
            return '"url" must not be set when "send_to_self" is true';
          }
          if (value.headers) {
            return '"headers" must not be set when "send_to_self" is true';
          }
        } else if (!value.url) {
          return '"url" is required when "send_to_self" is false';
        }
      },
    }
  );

export const inferenceTracingExportConfigSchema: Type<InferenceTracingExportConfig> = schema.oneOf([
  schema.object({
    langfuse: langfuseExportConfigSchema,
  }),
  schema.object({
    phoenix: phoenixExportConfigSchema,
  }),
  schema.object({
    agent_builder: agentBuilderExportConfigSchema,
  }),
]);
