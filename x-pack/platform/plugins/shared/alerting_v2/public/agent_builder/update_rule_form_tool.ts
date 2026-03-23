/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { FormValues } from '@kbn/alerting-v2-rule-form';

const updateRuleFormSchema = z.object({
  kind: z.enum(['alert', 'signal']).optional().describe('Rule kind.'),
  metadata: z
    .object({
      name: z.string().optional().describe('Rule name.'),
      description: z.string().optional().describe('Rule description.'),
      owner: z.string().optional().describe('Rule owner.'),
      labels: z.array(z.string()).optional().describe('Rule labels.'),
    })
    .optional()
    .describe('Rule metadata fields to update.'),
  time_field: z.string().optional().describe('Timestamp field (e.g. "@timestamp").'),
  schedule: z
    .object({
      every: z.string().optional().describe('Execution interval (e.g. "5m").'),
      lookback: z.string().optional().describe('Lookback window.'),
    })
    .optional()
    .describe('Schedule fields to update.'),
  evaluation: z
    .object({
      query: z.object({
        base: z.string().optional().describe('Base ES|QL query.'),
        condition: z.string().optional().describe('Additional condition.'),
      }),
    })
    .optional()
    .describe('Evaluation query to update.'),
  grouping: z
    .object({
      fields: z.array(z.string()).describe('Group-by fields.'),
    })
    .optional()
    .describe('Grouping configuration.'),
  state_transition: z
    .object({
      pending_count: z.number().optional(),
      pending_timeframe: z.string().optional(),
      recovering_count: z.number().optional(),
      recovering_timeframe: z.string().optional(),
    })
    .optional()
    .describe('State transition thresholds.'),
  recovery_policy: z
    .object({
      type: z.enum(['query', 'no_breach']).describe('Recovery detection type.'),
      query: z
        .object({
          base: z.string().optional(),
          condition: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Recovery policy configuration.'),
});

type UpdateRuleFormParams = z.infer<typeof updateRuleFormSchema>;

const mapParamsToFormValues = (params: UpdateRuleFormParams): Partial<FormValues> => {
  const values: Partial<FormValues> = {};

  if (params.kind) {
    values.kind = params.kind;
  }

  if (params.metadata) {
    values.metadata = {
      name: params.metadata.name ?? '',
      enabled: true,
      description: params.metadata.description,
      owner: params.metadata.owner,
      labels: params.metadata.labels,
    };
  }

  if (params.time_field) {
    values.timeField = params.time_field;
  }

  if (params.schedule) {
    values.schedule = {
      every: params.schedule.every ?? '5m',
      lookback: params.schedule.lookback ?? params.schedule.every ?? '5m',
    };
  }

  if (params.evaluation) {
    values.evaluation = {
      query: {
        base: params.evaluation.query.base,
        condition: params.evaluation.query.condition,
      },
    };
  }

  if (params.grouping) {
    values.grouping = { fields: params.grouping.fields };
  }

  if (params.state_transition) {
    values.stateTransition = {
      pendingCount: params.state_transition.pending_count,
      pendingTimeframe: params.state_transition.pending_timeframe,
      recoveringCount: params.state_transition.recovering_count,
      recoveringTimeframe: params.state_transition.recovering_timeframe,
    };
  }

  if (params.recovery_policy) {
    values.recoveryPolicy = {
      type: params.recovery_policy.type,
      query: params.recovery_policy.query,
    };
  }

  return values;
};

export const createUpdateRuleFormTool = (
  setFormValues: (values: Partial<FormValues>, query?: string) => void
): BrowserApiToolDefinition<UpdateRuleFormParams> => ({
  id: 'alerting_v2_update_rule_form',
  description:
    'Update the rule configuration form currently open in rule management. ' +
    'Only include the fields that need to change. The form will be updated in place.',
  schema: updateRuleFormSchema,
  handler: (params) => {
    const formValues = mapParamsToFormValues(params);
    const query = params.evaluation?.query?.base;
    setFormValues(formValues, query);
  },
});
