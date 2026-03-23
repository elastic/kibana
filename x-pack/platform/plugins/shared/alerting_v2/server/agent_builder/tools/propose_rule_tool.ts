/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { RULE_TYPE, type RuleAttachmentData } from '../../../common/attachment_types';

const proposeRuleSchema = z.object({
  attachment_id: z
    .string()
    .optional()
    .describe(
      'ID of an existing rule attachment to update. ' +
        'Pass this when refining a previously proposed rule to update it in-place.'
    ),
  kind: z
    .enum(['alert', 'signal'])
    .describe(
      '"alert" for lifecycle-tracked rules with notification policies; ' +
        '"signal" for point-in-time detection events with no lifecycle tracking.'
    ),
  metadata: z.object({
    name: z.string().describe('Human-readable rule name.'),
    description: z.string().optional().describe('Longer description of the rule purpose.'),
    owner: z.string().optional().describe('Team or user who owns this rule.'),
    labels: z.array(z.string()).optional().describe('Labels for categorization and filtering.'),
  }),
  time_field: z
    .string()
    .describe('The timestamp field used for time-range queries (e.g. "@timestamp").'),
  schedule: z.object({
    every: z.string().describe('ISO 8601 duration for execution interval (e.g. "5m", "1h").'),
    lookback: z
      .string()
      .optional()
      .describe('Lookback window override. Defaults to the schedule interval.'),
  }),
  evaluation: z.object({
    query: z.object({
      base: z
        .string()
        .describe('The base ES|QL query to evaluate (e.g. "FROM logs-* | WHERE status >= 500").'),
      condition: z.string().optional().describe('Additional condition appended to the base query.'),
    }),
  }),
  grouping: z
    .object({
      fields: z
        .array(z.string())
        .describe('Fields to group alerts by (e.g. ["host.name", "service.name"]).'),
    })
    .optional(),
  state_transition: z
    .object({
      pending_count: z
        .number()
        .optional()
        .describe('Number of consecutive breaches before transitioning from pending to active.'),
      pending_timeframe: z.string().optional().describe('Time window for pending threshold.'),
      recovering_count: z.number().optional(),
      recovering_timeframe: z.string().optional(),
    })
    .optional(),
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
    .optional(),
  source_index: z
    .string()
    .optional()
    .describe('The data source index this rule targets (for display context).'),
});

export const proposeRuleTool = (): BuiltinToolDefinition<typeof proposeRuleSchema> => ({
  id: `${internalNamespaces.alertingV2}.propose_rule`,
  type: ToolType.builtin,
  description:
    'Propose a rule configuration to the user as a reviewable attachment. ' +
    'The user can preview and edit the configuration in an interactive form before creating. ' +
    'Use this before create_rule so the user can review the proposed configuration.',
  tags: ['alerting'],
  schema: proposeRuleSchema,
  handler: async (params, { events, attachments }) => {
    events.reportProgress('Preparing rule proposal...');

    const attachmentData: RuleAttachmentData = {
      kind: params.kind,
      metadata: {
        name: params.metadata.name,
        enabled: true,
        description: params.metadata.description,
        owner: params.metadata.owner,
        labels: params.metadata.labels,
      },
      timeField: params.time_field,
      schedule: {
        every: params.schedule.every,
        lookback: params.schedule.lookback ?? params.schedule.every,
      },
      evaluation: {
        query: {
          base: params.evaluation.query.base,
          condition: params.evaluation.query.condition,
        },
      },
      ...(params.grouping ? { grouping: { fields: params.grouping.fields } } : {}),
      ...(params.state_transition
        ? {
            stateTransition: {
              pendingCount: params.state_transition.pending_count,
              pendingTimeframe: params.state_transition.pending_timeframe,
              recoveringCount: params.state_transition.recovering_count,
              recoveringTimeframe: params.state_transition.recovering_timeframe,
            },
          }
        : {}),
      ...(params.recovery_policy
        ? {
            recoveryPolicy: {
              type: params.recovery_policy.type,
              query: params.recovery_policy.query,
            },
          }
        : {}),
      ...(params.source_index ? { sourceIndex: params.source_index } : {}),
    };

    const existingId =
      params.attachment_id ?? attachments.getActive().find((a) => a.type === RULE_TYPE)?.id;

    let attachmentId: string;

    if (existingId && attachments.getAttachmentRecord(existingId)) {
      await attachments.update(existingId, {
        data: attachmentData,
        description: `Proposed rule: ${params.metadata.name}`,
      });
      attachmentId = existingId;
    } else {
      const created = await attachments.add({
        type: RULE_TYPE,
        data: attachmentData,
        description: `Proposed rule: ${params.metadata.name}`,
      });
      attachmentId = created.id;
    }

    const data: Record<string, unknown> = {
      attachmentId,
      name: params.metadata.name,
      kind: params.kind,
      query: params.evaluation.query.base,
      schedule: params.schedule.every,
      _renderInstructions: [
        'IMPORTANT: You MUST start your response with the render tag below as the VERY FIRST LINE.',
        'Do NOT write any text before it. The tag must be the first thing in your message.',
        'After the tag, leave a blank line, then write your explanation.',
        '',
        'Your response MUST start exactly like this:',
        '',
        `<render_attachment id="${attachmentId}"/>`,
        '',
        'Here is the rule configuration I am proposing...',
      ].join('\n'),
    };

    return {
      results: [{ type: ToolResultType.other, data }],
    };
  },
});
