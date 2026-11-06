/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, spaceId, z } from '@kbn/zod/v4';
import { alertEpisodeStatusSchema } from './alert_episode_schema';
import {
  ACTION_POLICY_MAX_DESTINATIONS,
  ACTION_POLICY_TEST_MAX_ALERTS,
  ID_MAX_LENGTH,
  MAX_ALERT_EVENT_DATA_KEYS,
  MAX_FIELD_NAME_LENGTH,
  MAX_NAME_LENGTH,
  SERIES_ID_MAX_LENGTH,
} from './constants';
import { alertEventSeveritySchema } from './severity';

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

const maxKeys =
  (max: number) =>
  (record: Record<string, unknown>, ctx: z.RefinementCtx): void => {
    if (Object.keys(record).length > max) {
      ctx.addIssue({ code: 'custom', message: `Must have at most ${max} keys` });
    }
  };

const openRecordSchema = () =>
  z
    .record(z.string().max(MAX_FIELD_NAME_LENGTH), z.unknown())
    .superRefine(maxKeys(MAX_ALERT_EVENT_DATA_KEYS));

const identifierSchema = () => z.string().min(1).max(ID_MAX_LENGTH);

const actionPolicyWorkflowPayloadAlertSchema = lazySchema(() =>
  z
    .object({
      last_event_timestamp: isoDateTime().describe(
        'Timestamp of the latest event seen for this alert'
      ),
      rule_id: z
        .string()
        .max(ID_MAX_LENGTH)
        .nullable()
        .describe('Identifier of the rule that produced this alert'),
      source: identifierSchema().describe(
        'Origin of the alert events for this alert (e.g. `internal`)'
      ),
      space_id: spaceId().describe('Identifier of the space the alert belongs to'),
      group_hash: z
        .string()
        .min(1)
        .max(SERIES_ID_MAX_LENGTH)
        .describe('Hash identifying the alert series/group this alert belongs to'),
      alert_id: identifierSchema().describe('Unique identifier of the alert'),
      alert_url: z
        .url({ protocol: /^https?$/ })
        .max(SERIES_ID_MAX_LENGTH)
        .describe('Absolute URL of the alert details page in Kibana, in the alert space'),
      alert_status: alertEpisodeStatusSchema.describe('Current lifecycle status of the alert'),
      severity: alertEventSeveritySchema.optional().describe('Severity of the alert'),
      data: openRecordSchema().optional().describe('Data of the alert'),
    })
    .strict()
);

const actionPolicyWorkflowPayloadRuleSchema = lazySchema(() =>
  z
    .object({
      name: z.string().min(1).max(MAX_NAME_LENGTH).describe('Display name of the rule'),
    })
    .strict()
);

/**
 * Workflow payload of one action group, as the dispatcher sends it to a workflow as
 * `inputs.payload`. Mirrors `ActionPolicyWorkflowPayload` and the workflows
 * `alertingV2NotificationGroup` input definition.
 */
export const actionPolicyWorkflowPayloadSchema = lazySchema(() =>
  z
    .object({
      id: identifierSchema().describe('Unique identifier of the notification group'),
      policyId: identifierSchema().describe(
        'Identifier of the action policy that matched and dispatched the group'
      ),
      groupKey: openRecordSchema().describe('Grouping key of the notification group'),
      alerts: z
        .array(actionPolicyWorkflowPayloadAlertSchema)
        .min(1)
        .max(ACTION_POLICY_TEST_MAX_ALERTS)
        .describe('Alerts included in this notification group'),
      rules: z
        .record(z.string().max(ID_MAX_LENGTH), actionPolicyWorkflowPayloadRuleSchema)
        .superRefine(maxKeys(ACTION_POLICY_TEST_MAX_ALERTS))
        .describe('Rule metadata keyed by rule id, for the rules referenced by the alerts'),
    })
    .strict()
    .meta({ id: 'alerting_action_policy_workflow_payload' })
);

export type ActionPolicyWorkflowPayloadInput = z.input<typeof actionPolicyWorkflowPayloadSchema>;

export const actionPolicyTestSendBodySchema = lazySchema(() =>
  z
    .object({
      payload: actionPolicyWorkflowPayloadSchema.describe(
        'The workflow payload sent to each destination as `inputs.payload`.'
      ),
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

export const actionPolicyTestPreviewResponseSchema = lazySchema(() =>
  z.object({
    seed: testScenarioSeedSchema,
    groups: z.array(actionPolicyWorkflowPayloadSchema),
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
