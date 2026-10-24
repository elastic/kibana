/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { PLATFORM_IDS } from '../../constants';
import { isWithinMaxWait, MAX_AGENT_IDS, MAX_AGENT_POLICY_IDS, MAX_ROWS } from './budget';

export const STEP_STATUSES = ['success', 'partial', 'failed', 'timed_out'] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

/** Raw input fields shared by both steps, to be spread into `z.object`. */
export const commonInputShape = () => ({
  agent_ids: z.array(z.string().min(1)).min(1).max(MAX_AGENT_IDS).optional(),
  agent_policy_ids: z.array(z.string().min(1)).min(1).max(MAX_AGENT_POLICY_IDS).optional(),
  // osquery platform ids, as on saved queries and packs. The step expands `linux` to the Fleet
  // platform values (`ubuntu`, `centos`, ...) of the agents in scope before dispatch.
  agent_platforms: z.array(z.enum(PLATFORM_IDS)).min(1).max(PLATFORM_IDS.length).optional(),
  wait_timeout: z
    .string()
    .regex(/^[1-9][0-9]*(s|m|h)$/, 'Use a duration such as 30s, 5m or 30m')
    .refine(isWithinMaxWait, 'wait_timeout cannot exceed 30m')
    .optional(),
  max_rows: z.number().int().min(1).max(MAX_ROWS).optional(),
});

export interface TargetInput {
  agent_ids?: string[];
  agent_policy_ids?: string[];
  agent_platforms?: string[];
}

/** Exactly one of the three targeting inputs must be set. */
export const hasExactlyOneTarget = (input: TargetInput): boolean =>
  [input.agent_ids, input.agent_policy_ids, input.agent_platforms].filter(
    (target) => target !== undefined
  ).length === 1;

export const EXACTLY_ONE_TARGET_MESSAGE =
  'Set exactly one of agent_ids, agent_policy_ids or agent_platforms';

export const agentsSummarySchema = () =>
  z.object({
    total: z.number(),
    responded: z.number(),
    pending: z.number(),
    failed: z.number(),
  });

export const resultRowSchema = () =>
  z.object({
    agent: z.object({ id: z.string(), name: z.string().optional() }),
    '@timestamp': z.string().optional(),
    columns: z.record(z.string(), z.string()),
    ecs: z.record(z.string(), z.unknown()),
  });

/** What one query reports: the whole output of `runQuery`, one `queries[]` entry of `runPack`. */
export const queryResultShape = () => ({
  status: z.enum(STEP_STATUSES),
  agents: agentsSummarySchema(),
  rows: z.array(resultRowSchema()),
  row_count: z.number(),
  truncated: z.boolean(),
});
