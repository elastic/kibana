/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ExternalWorkflowServiceConfigurationSchema = schema.object({});

export const ExternalWorkflowServiceSecretConfigurationSchema = schema.object({});

const RunSubActionParamsSchema = schema.object({
  workflowId: schema.string(),
  inputs: schema.maybe(schema.any()),
});

// Schema for rule configuration (what the UI saves)
export const WorkflowsRuleActionParamsSchema = schema.object({
  subAction: schema.literal('run'),
  subActionParams: schema.object({
    workflowId: schema.string(),
    inputs: schema.maybe(schema.any()),
  }),
});

// Schema for execution (what the executor receives)
export const ExecutorParamsSchema = schema.object({
  subAction: schema.literal('run'),
  subActionParams: RunSubActionParamsSchema,
});

export const ExecutorSubActionRunParamsSchema = RunSubActionParamsSchema;
