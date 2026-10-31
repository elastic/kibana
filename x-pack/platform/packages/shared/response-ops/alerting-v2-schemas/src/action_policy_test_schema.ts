/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { ACTION_POLICY_MAX_DESTINATIONS, ID_MAX_LENGTH } from './constants';

/** Largest seed a test scenario accepts: the scenario's random generator works on 32-bit integers. */
export const ACTION_POLICY_TEST_SEED_MAX = 2_147_483_647;

const testScenarioSeedSchema = lazySchema(() =>
  z
    .number()
    .int()
    .min(0)
    .max(ACTION_POLICY_TEST_SEED_MAX)
    .describe('Seed of the synthetic scenario. The same seed builds the same alerts and rules.')
);

export const actionPolicyTestPreviewBodySchema = lazySchema(() =>
  z
    .object({
      seed: testScenarioSeedSchema.optional(),
    })
    .strict()
    .meta({ id: 'alerting_action_policy_test_preview_request' })
);

export type ActionPolicyTestPreviewBody = z.infer<typeof actionPolicyTestPreviewBodySchema>;

export const actionPolicyTestSendBodySchema = lazySchema(() =>
  z
    .object({
      seed: testScenarioSeedSchema,
      destination_ids: z
        .array(z.string().min(1).max(ID_MAX_LENGTH))
        .min(1)
        .max(ACTION_POLICY_MAX_DESTINATIONS)
        .describe('The policy destination workflows that receive the test notification.'),
    })
    .strict()
    .meta({ id: 'alerting_action_policy_test_send_request' })
);

export type ActionPolicyTestSendBody = z.infer<typeof actionPolicyTestSendBodySchema>;

const actionPolicyTestDestinationSchema = lazySchema(() =>
  z.object({
    id: z.string().describe('The workflow identifier.'),
    name: z
      .string()
      .optional()
      .describe('The workflow name. Absent when the workflow cannot be read by the user.'),
    enabled: z
      .boolean()
      .optional()
      .describe('Whether the workflow is enabled. Absent when the workflow cannot be read.'),
    executable: z.boolean().describe('Whether the user can run the workflow.'),
  })
);

export type ActionPolicyTestDestination = z.infer<typeof actionPolicyTestDestinationSchema>;

const actionPolicyTestPayloadSchema = lazySchema(() =>
  z
    .record(z.string(), z.unknown())
    .describe(
      'The workflow payload of one action group, passed to the workflow as `inputs.payload`.'
    )
);

export const actionPolicyTestPreviewResponseSchema = lazySchema(() =>
  z.object({
    seed: testScenarioSeedSchema,
    groups: z.array(actionPolicyTestPayloadSchema),
    destinations: z.array(actionPolicyTestDestinationSchema),
  })
);

export interface ActionPolicyTestPreviewParams {
  policyId: string;
  seed?: number;
}

export type ActionPolicyTestPreviewResponse = z.infer<typeof actionPolicyTestPreviewResponseSchema>;

const actionPolicyTestSendResultSchema = lazySchema(() =>
  z.union([
    z.object({
      workflow_id: z.string(),
      workflow_execution_id: z.string().describe('The id of the workflow test run.'),
    }),
    z.object({
      workflow_id: z.string(),
      error: z.string().describe('Why the workflow test run could not be started.'),
    }),
  ])
);

export type ActionPolicyTestSendResult = z.infer<typeof actionPolicyTestSendResultSchema>;

export const actionPolicyTestSendResponseSchema = lazySchema(() =>
  z.object({
    results: z
      .array(actionPolicyTestSendResultSchema)
      .describe('One result per destination, in the order of `destination_ids`.'),
  })
);

export type ActionPolicyTestSendResponse = z.infer<typeof actionPolicyTestSendResponseSchema>;
