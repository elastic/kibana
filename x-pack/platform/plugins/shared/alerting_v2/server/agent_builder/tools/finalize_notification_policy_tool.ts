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
  RULE_TYPE,
  type RuleAttachmentData,
  type NotificationPolicyAttachmentData,
} from '../../../common/attachment_types';

const extractLabelsFromMatcher = (matcher: string | undefined): string[] => {
  if (!matcher) return [];
  const labels: string[] = [];
  const regex = /rule\.labels\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(matcher)) !== null) {
    labels.push(match[1]);
  }
  return labels;
};

const finalizeNotificationPolicySchema = z.object({
  draft_id: z
    .string()
    .describe(
      'The draftId returned by draft_notification_policy. ' +
        'The draft must have passed validation via validate_notification_policy.'
    ),
});

export const finalizeNotificationPolicyTool = (): BuiltinToolDefinition<
  typeof finalizeNotificationPolicySchema
> => ({
  id: `${internalNamespaces.alertingV2}.finalize_notification_policy`,
  type: ToolType.builtin,
  description:
    'Finalize a validated notification policy draft by making the attachment visible to the user. ' +
    'The draft must have validationStatus "valid" (set by validate_notification_policy). ' +
    'This is the only step that produces a user-visible proposal attachment.',
  tags: ['alerting', 'notifications'],
  schema: finalizeNotificationPolicySchema,
  handler: async ({ draft_id: draftId }, { events, attachments }) => {
    events.reportProgress('Finalizing notification policy...');

    const record = attachments.getAttachmentRecord(draftId);
    if (!record) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              error:
                `No draft found with id "${draftId}". ` +
                'Call draft_notification_policy first to create a draft.',
            },
          },
        ],
      };
    }

    const latestVersion = record.versions[record.versions.length - 1];
    const data = latestVersion?.data as NotificationPolicyAttachmentData | undefined;

    if (!data) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { error: 'Draft attachment has no data. Re-create the draft.' },
          },
        ],
      };
    }

    if (data.validationStatus !== 'valid') {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              error:
                'Draft has not passed validation. ' +
                'Call validate_notification_policy with this draftId first.',
              validationStatus: data.validationStatus ?? 'none',
              validationErrors: data.validationErrors,
            },
          },
        ],
      };
    }

    await attachments.update(draftId, { hidden: false });

    const matcherLabels = extractLabelsFromMatcher(data.matcher);
    const updatedRuleIds: string[] = [];

    if (matcherLabels.length > 0) {
      const ruleAttachments = attachments.getActive().filter((a) => a.type === RULE_TYPE);

      for (const ruleAttachment of ruleAttachments) {
        const latestRuleVersion = ruleAttachment.versions[ruleAttachment.versions.length - 1];
        const ruleData = latestRuleVersion?.data as RuleAttachmentData | undefined;
        if (ruleData) {
          const existingLabels = ruleData.metadata.labels ?? [];
          const merged = [...new Set([...existingLabels, ...matcherLabels])];
          if (merged.length !== existingLabels.length) {
            await attachments.update(ruleAttachment.id, {
              data: { ...ruleData, metadata: { ...ruleData.metadata, labels: merged } },
            });
            updatedRuleIds.push(ruleAttachment.id);
          }
        }
      }
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            attachmentId: draftId,
            name: data.name,
            workflowName: data.workflow.name,
            workflowSource: data.workflow.source,
            matcher: data.matcher,
            ...(updatedRuleIds.length > 0
              ? { updatedRuleAttachments: updatedRuleIds, labelsAdded: matcherLabels }
              : {}),
            _renderInstructions: [
              'IMPORTANT: You MUST start your response with the render tag below as the VERY FIRST LINE.',
              'Do NOT write any text before it. The tag must be the first thing in your message.',
              'After the tag, leave a blank line, then write your explanation.',
              '',
              'Your response MUST start exactly like this:',
              '',
              `<render_attachment id="${draftId}"/>`,
              '',
              'Here is the notification policy I am proposing...',
            ].join('\n'),
          },
        },
      ],
    };
  },
});
