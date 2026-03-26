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
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { NotificationPolicyAttachmentData } from '../../../common/attachment_types';

const validateNotificationPolicySchema = z.object({
  draft_id: z.string().describe('The draftId returned by draft_notification_policy. Required.'),
});

export const validateNotificationPolicyTool = (
  workflowsApi: WorkflowsManagementApi
): BuiltinToolDefinition<typeof validateNotificationPolicySchema> => ({
  id: `${internalNamespaces.alertingV2}.validate_notification_policy`,
  type: ToolType.builtin,
  description:
    'Validate a notification policy draft. Reads the hidden draft attachment created by ' +
    'draft_notification_policy, runs full workflow YAML validation, and updates the draft ' +
    'with the validation result. Call finalize_notification_policy after validation passes.',
  tags: ['alerting', 'notifications'],
  schema: validateNotificationPolicySchema,
  handler: async ({ draft_id: draftId }, { events, attachments, spaceId, request }) => {
    events.reportProgress('Validating notification policy draft...');

    const record = attachments.getAttachmentRecord(draftId);
    if (!record) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              valid: false,
              draftId,
              errors: [
                `No draft found with id "${draftId}". ` +
                  'Call draft_notification_policy first to create a draft.',
              ],
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
            data: {
              valid: false,
              draftId,
              errors: ['Draft attachment has no data. Re-create the draft.'],
            },
          },
        ],
      };
    }

    const errors: string[] = [];

    if (data.workflow.source === 'inline') {
      try {
        const validation = await workflowsApi.validateWorkflow(
          data.workflow.yaml,
          spaceId,
          request
        );
        if (!validation.valid) {
          const yamlErrors = validation.diagnostics
            .filter((d: { severity: string }) => d.severity === 'error')
            .map((d: { message: string }) => d.message);
          errors.push(...yamlErrors);
        }
      } catch (err) {
        errors.push(
          `Workflow validation service error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (data.matcher) {
      const matcherTrimmed = data.matcher.trim();
      if (matcherTrimmed.length === 0) {
        errors.push('Matcher expression is empty. Provide a valid matcher or omit it.');
      }
    }

    const isValid = errors.length === 0;
    const validationStatus = isValid ? 'valid' : 'invalid';

    await attachments.update(draftId, {
      data: {
        ...data,
        validationStatus,
        validationErrors: isValid ? undefined : errors,
        ...(data.workflow.source === 'inline' ? { workflow: { ...data.workflow, isValid } } : {}),
      },
    });

    const result: Record<string, unknown> = {
      valid: isValid,
      draftId,
    };

    if (isValid) {
      result._instruction =
        'IMPORTANT: Do NOT respond to the user yet. You MUST immediately call ' +
        'finalize_notification_policy with this draftId as the next tool call. ' +
        'The pipeline is not complete until finalize returns.';
    } else {
      result.errors = errors;
      result._instruction =
        'Validation failed. Call draft_notification_policy again with draft_id set to ' +
        'this draftId and corrected parameters, then re-validate. ' +
        'Do NOT respond to the user until the pipeline completes.';
    }

    return {
      results: [{ type: ToolResultType.other, data: result }],
    };
  },
});
