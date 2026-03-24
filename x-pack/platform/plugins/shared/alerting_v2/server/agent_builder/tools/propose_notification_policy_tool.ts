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
import {
  NOTIFICATION_POLICY_TYPE,
  type NotificationPolicyAttachmentData,
} from '../../../common/attachment_types';

const workflowParamSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('existing'),
    id: z.string().describe('Saved-object ID of the existing workflow.'),
    name: z.string().describe('Display name of the existing workflow.'),
  }),
  z.object({
    source: z.literal('inline'),
    name: z.string().describe('Name for the new workflow to create.'),
    description: z.string().optional().describe('Description of what the workflow does.'),
    yaml: z
      .string()
      .describe(
        'Complete workflow YAML definition. MUST include: ' +
          '(1) a manual trigger (not alert or scheduled), ' +
          '(2) an inputs schema accepting the notification dispatcher payload ' +
          '(id, ruleId, policyId, groupKey, episodes), ' +
          '(3) steps using connector-id for the target notification channel. ' +
          'Use get_step_definitions to look up valid step types and their with-block params. ' +
          'Call validate_workflow before proposing.'
      ),
    connector_types: z
      .array(z.string())
      .optional()
      .describe('Connector types used (e.g. "slack", "email", "pagerduty").'),
    is_valid: z
      .boolean()
      .optional()
      .describe('Whether the YAML passed validation via validate_workflow.'),
  }),
]);

const proposeNotificationPolicySchema = z.object({
  attachment_id: z
    .string()
    .optional()
    .describe(
      'ID of an existing notification policy attachment to update. ' +
        'Pass this when refining a previously proposed policy to update it in-place.'
    ),
  name: z.string().describe('Human-readable notification policy name.'),
  description: z.string().describe('Description of what the policy does.'),
  matcher: z
    .string()
    .optional()
    .describe(
      'Matcher expression that determines which alert episodes trigger this policy ' +
        '(e.g. \'data.labels : "environment:production"\').'
    ),
  group_by: z
    .array(z.string())
    .optional()
    .describe('Fields to group notifications by (e.g. ["host.name", "service.name"]).'),
  throttle_interval: z
    .string()
    .optional()
    .describe(
      'Minimum interval between repeated notifications for the same episode (e.g. "1h", "5m").'
    ),
  workflow: workflowParamSchema.describe(
    'The workflow destination. Use source "existing" to reference a saved workflow by ID, ' +
      'or source "inline" to embed a new workflow YAML that will be created alongside the policy.'
  ),
});

export const proposeNotificationPolicyTool = (): BuiltinToolDefinition<
  typeof proposeNotificationPolicySchema
> => ({
  id: `${internalNamespaces.alertingV2}.propose_notification_policy`,
  type: ToolType.builtin,
  description:
    'Propose a notification policy with its associated workflow as a single reviewable attachment. ' +
    'The user can preview both the policy and the workflow in a tabbed canvas, then create both ' +
    'with one click. Use source "inline" to embed a new workflow YAML, or source "existing" to ' +
    'reference a saved workflow.',
  tags: ['alerting', 'notifications'],
  schema: proposeNotificationPolicySchema,
  handler: async (params, { events, attachments }) => {
    events.reportProgress('Preparing notification policy proposal...');

    const workflow =
      params.workflow.source === 'existing'
        ? {
            source: 'existing' as const,
            id: params.workflow.id,
            name: params.workflow.name,
          }
        : {
            source: 'inline' as const,
            name: params.workflow.name,
            description: params.workflow.description,
            yaml: params.workflow.yaml,
            connectorTypes: params.workflow.connector_types,
            isValid: params.workflow.is_valid,
          };

    const attachmentData: NotificationPolicyAttachmentData = {
      name: params.name,
      description: params.description,
      ...(params.matcher ? { matcher: params.matcher } : {}),
      ...(params.group_by?.length ? { groupBy: params.group_by } : {}),
      ...(params.throttle_interval ? { throttle: { interval: params.throttle_interval } } : {}),
      workflow,
    };

    const existingId =
      params.attachment_id ??
      attachments.getActive().find((a) => a.type === NOTIFICATION_POLICY_TYPE)?.id;

    let attachmentId: string;

    if (existingId && attachments.getAttachmentRecord(existingId)) {
      await attachments.update(existingId, {
        data: attachmentData,
        description: `Proposed notification policy: ${params.name}`,
      });
      attachmentId = existingId;
    } else {
      const created = await attachments.add({
        type: NOTIFICATION_POLICY_TYPE,
        data: attachmentData,
        description: `Proposed notification policy: ${params.name}`,
      });
      attachmentId = created.id;
    }

    const data: Record<string, unknown> = {
      attachmentId,
      name: params.name,
      workflowName: params.workflow.name,
      workflowSource: params.workflow.source,
      matcher: params.matcher,
      _renderInstructions: [
        'IMPORTANT: You MUST start your response with the render tag below as the VERY FIRST LINE.',
        'Do NOT write any text before it. The tag must be the first thing in your message.',
        'After the tag, leave a blank line, then write your explanation.',
        '',
        'Your response MUST start exactly like this:',
        '',
        `<render_attachment id="${attachmentId}"/>`,
        '',
        'Here is the notification policy I am proposing...',
      ].join('\n'),
    };

    return {
      results: [{ type: ToolResultType.other, data }],
    };
  },
});
