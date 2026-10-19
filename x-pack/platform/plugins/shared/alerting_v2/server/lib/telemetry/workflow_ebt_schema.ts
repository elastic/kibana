/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  groupingModeSchema,
  ID_MAX_LENGTH,
  ruleIdSchema,
  throttleStrategySchema,
} from '@kbn/alerting-v2-schemas';

export const WORKFLOW_DISPATCHED_EBT_EVENT_TYPE = 'alerting_v2_workflow_dispatched' as const;

export type WorkflowDispatchedEbtEventType = typeof WORKFLOW_DISPATCHED_EBT_EVENT_TYPE;

const idSchema = lazySchema(() => z.string().min(1).max(ID_MAX_LENGTH));

/**
 * Payload of the telemetry event reported each time an action policy
 * successfully schedules a workflow. A group that fans out to several
 * workflows reports one event per destination.
 */
export const workflowDispatchedTelemetryDataSchema = lazySchema(() =>
  z.object({
    workflow_id: idSchema.describe('The id of the workflow that was dispatched.'),
    action_policy_id: idSchema.describe('The id of the action policy that triggered the dispatch.'),
    workflow_execution_id: idSchema.describe('The execution id assigned to this workflow run.'),
    space_id: idSchema.describe('The space the dispatch occurred in.'),
    rule_id: z
      .array(ruleIdSchema)
      .describe('Ids of every rule whose alerts appear in this dispatch.'),
    alert_count: z.number().int().nonnegative().describe('Number of alerts in this dispatch.'),
    rule_count: z
      .number()
      .int()
      .nonnegative()
      .describe('Number of distinct rules whose alerts appear in this dispatch.'),
    throttle_strategy: throttleStrategySchema,
    grouping_mode: groupingModeSchema,
  })
);

export type WorkflowDispatchedEbtData = z.infer<typeof workflowDispatchedTelemetryDataSchema>;
