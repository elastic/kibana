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
import {
  generateNotificationWorkflowYaml,
  type EpisodeStatus,
} from './lib/generate_notification_workflow_yaml';

const draftNotificationPolicySchema = z.object({
  draft_id: z
    .string()
    .optional()
    .describe(
      'ID of an existing draft to update (returned by a previous draft call). ' +
        'Omit when creating a new draft.'
    ),
  policy_name: z.string().describe('Human-readable notification policy name.'),
  policy_description: z.string().describe('Description of what the policy does.'),
  policy_matcher: z
    .string()
    .optional()
    .describe(
      'Matcher expression that determines which alert episodes trigger this policy ' +
        '(e.g. \'rule.labels : "environment:production"\').'
    ),
  policy_group_by: z
    .array(z.string())
    .optional()
    .describe('Fields to group notifications by (e.g. ["host.name"]).'),
  policy_throttle_interval: z
    .string()
    .optional()
    .describe('Minimum interval between repeated notifications (e.g. "5m", "1h").'),
  workflow_source: z
    .enum(['new', 'existing'])
    .describe('"new" to generate a workflow from parameters, "existing" to reference a saved one.'),
  workflow_name: z.string().describe('Name for the workflow (new) or display name (existing).'),
  workflow_description: z
    .string()
    .optional()
    .describe('Description of what the workflow does (only for new workflows).'),
  workflow_id: z
    .string()
    .optional()
    .describe(
      'The workflowId of an existing workflow (required when workflow_source is "existing"). ' +
        'Use the workflowId from get_notification_policy_context results.'
    ),
  connector_id: z
    .string()
    .optional()
    .describe(
      'The connectorId from get_notification_policy_context results ' +
        '(required when workflow_source is "new").'
    ),
  connector_type: z
    .string()
    .optional()
    .describe(
      'The connector step type, e.g. "slack", "email", "pagerduty" ' +
        '(required when workflow_source is "new"). ' +
        'Use the first entry from the stepTypes array in get_notification_policy_context.'
    ),
  notify_on: z
    .array(z.enum(['active', 'recovering', 'inactive']))
    .optional()
    .describe(
      'Episode statuses to send notifications for (required when workflow_source is "new").'
    ),
  messages: z
    .record(z.string(), z.record(z.string(), z.unknown()))
    .optional()
    .describe(
      'Message content keyed by episode status (required when workflow_source is "new"). ' +
        'STRUCTURE: The outer keys MUST be episode status names (e.g. "active", "recovering"). ' +
        'Each value is an object of connector withParams fields. ' +
        'Slack example: { "active": { "message": "Alert {ruleId} fired" } }. ' +
        'Email example: { "active": { "to": ["oncall@example.com"], "subject": "Alert {ruleId}", "message": "Episode {episodeId} is active" } }. ' +
        'PagerDuty example: { "active": { "eventAction": "trigger", "summary": "Alert {ruleId}", "severity": "critical" } }. ' +
        'Use placeholders like {ruleId}, {episodeId}, {episodeStatus} in string values — ' +
        'the server expands them to Liquid syntax automatically.'
    ),
});

export const draftNotificationPolicyTool = (): BuiltinToolDefinition<
  typeof draftNotificationPolicySchema
> => ({
  id: `${internalNamespaces.alertingV2}.draft_notification_policy`,
  type: ToolType.builtin,
  description:
    'Create or update a notification policy draft with its associated workflow. ' +
    'For new workflows, pass connector_id, connector_type, notify_on, and messages — ' +
    'the server generates the workflow YAML automatically. ' +
    'The draft is stored as a hidden attachment — call validate_notification_policy next.',
  tags: ['alerting', 'notifications'],
  schema: draftNotificationPolicySchema,
  handler: async (params, { events, attachments }) => {
    events.reportProgress('Drafting notification policy...');

    let workflow: NotificationPolicyAttachmentData['workflow'];

    if (params.workflow_source === 'new') {
      if (!params.connector_id || !params.connector_type || !params.notify_on || !params.messages) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error:
                  'When workflow_source is "new", you must provide connector_id, connector_type, ' +
                  'notify_on, and messages.',
              },
            },
          ],
        };
      }

      const yaml = generateNotificationWorkflowYaml({
        name: params.workflow_name,
        description: params.workflow_description,
        connector: { connectorId: params.connector_id, type: params.connector_type },
        notifyOn: params.notify_on as EpisodeStatus[],
        messages: params.messages,
      });

      workflow = {
        source: 'inline' as const,
        name: params.workflow_name,
        description: params.workflow_description,
        yaml,
        connectorTypes: [params.connector_type],
        isValid: undefined,
      };
    } else {
      if (!params.workflow_id) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error: 'When workflow_source is "existing", you must provide workflow_id.',
              },
            },
          ],
        };
      }

      workflow = {
        source: 'existing' as const,
        id: params.workflow_id,
        name: params.workflow_name,
      };
    }

    const attachmentData: NotificationPolicyAttachmentData = {
      name: params.policy_name,
      description: params.policy_description,
      ...(params.policy_matcher ? { matcher: params.policy_matcher } : {}),
      ...(params.policy_group_by?.length ? { groupBy: params.policy_group_by } : {}),
      ...(params.policy_throttle_interval
        ? { throttle: { interval: params.policy_throttle_interval } }
        : {}),
      workflow,
      validationStatus: 'pending',
    };

    let draftId: string;

    if (params.draft_id && attachments.getAttachmentRecord(params.draft_id)) {
      await attachments.update(params.draft_id, {
        data: attachmentData,
        description: `Draft notification policy: ${params.policy_name}`,
      });
      draftId = params.draft_id;
    } else {
      const created = await attachments.add({
        type: NOTIFICATION_POLICY_TYPE,
        data: attachmentData,
        description: `Draft notification policy: ${params.policy_name}`,
        hidden: true,
      });
      draftId = created.id;
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            draftId,
            _instruction:
              'IMPORTANT: Do NOT respond to the user yet. You MUST immediately call ' +
              'validate_notification_policy with this draftId as the next tool call. ' +
              'The pipeline is not complete until finalize_notification_policy has run.',
          },
        },
      ],
    };
  },
});
