/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { OutputSchema, UpdateOutputSchema } from '../models';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const DeleteOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetOutputsRequestSchema = {};

export const PostOutputRequestSchema = {
  body: OutputSchema,
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: UpdateOutputSchema,
};

export const GetLatestOutputHealthRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetLatestOutputHealthResponseSchema = schema.object({
  state: schema.string({
    meta: {
      description: 'state of output, HEALTHY or DEGRADED',
    },
  }),
  message: schema.string({
    meta: {
      description: 'long message if unhealthy',
    },
  }),
  timestamp: schema.string({
    meta: {
      description: 'timestamp of reported state',
    },
  }),
});

export const GetOutputAgentPolicyCountRequestSchema = {
  params: schema.object({
    outputId: schema.string({ maxLength: 500, meta: { description: 'The ID of the output' } }),
  }),
  query: schema.object({
    isDefault: schema.maybe(
      schema.boolean({
        meta: {
          description:
            "If true, count policies as if this output is the default data output, including policies with no `data_output_id`. If omitted, uses the output's saved `is_default` value.",
        },
      })
    ),
    isDefaultMonitoring: schema.maybe(
      schema.boolean({
        meta: {
          description:
            "If true, count policies as if this output is the default monitoring output, including policies with no `monitoring_output_id`. If omitted, uses the output's saved `is_default_monitoring` value.",
        },
      })
    ),
  }),
};

export const GetOutputAgentPolicyCountResponseSchema = schema.object({
  agentPolicyCount: schema.number({
    meta: { description: 'Number of agent policies using this output' },
  }),
  agentCount: schema.number({
    meta: { description: 'Number of active agents assigned to those policies' },
  }),
});
