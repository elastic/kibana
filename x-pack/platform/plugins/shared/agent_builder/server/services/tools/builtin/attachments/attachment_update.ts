/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';

const attachmentUpdateSchema = z.object({
  attachment_id: z.string().describe('ID of the attachment to update'),
  data: z.unknown().describe('New data/content for the attachment'),
  description: z.string().optional().describe('Optional new description for the attachment'),
});

/**
 * Creates the attachment_update tool.
 * Updates an attachment's content, creating a new version if content changed.
 */
export const createAttachmentUpdateTool = ({
  attachmentManager,
  attachmentsService,
}: AttachmentToolsOptions): BuiltinToolDefinition<typeof attachmentUpdateSchema> => ({
  id: platformCoreTools.attachmentUpdate,
  type: ToolType.builtin,
  description:
    'Update the content of an existing attachment. This creates a new version if the content changed. Use this to modify data you previously stored.',
  schema: attachmentUpdateSchema,
  tags: ['attachment'],
  handler: async ({ attachment_id: attachmentId, data, description }) => {
    const existing = attachmentManager.getAttachmentRecord(attachmentId);

    if (!existing) {
      return {
        results: [
          createErrorResult({
            message: `Attachment with ID '${attachmentId}' not found`,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    if (existing.active === false) {
      return {
        results: [
          createErrorResult({
            message: `Cannot update deleted attachment '${attachmentId}'. Restore it first.`,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    const definition = attachmentsService?.getTypeDefinition(existing.type);
    const typeReadonly = definition?.isReadonly ?? true;
    const isReadonly = typeReadonly || existing.readonly === true;
    if (isReadonly) {
      return {
        results: [
          createErrorResult({
            message: `Attachment '${attachmentId}' is read-only`,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    // Capture version before update (attachmentManager mutates the object in place)
    const previousVersion = existing.current_version;

    let updated;
    try {
      updated = await attachmentManager.update(
        attachmentId,
        { data, description },
        ATTACHMENT_REF_ACTOR.agent
      );
    } catch (e) {
      return {
        results: [
          createErrorResult({
            message: e.message,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    if (!updated) {
      return {
        results: [
          createErrorResult({
            message: `Failed to update attachment '${attachmentId}'`,
            metadata: { attachment_id: attachmentId },
          }),
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            attachment_id: attachmentId,
            type: updated.type,
            previous_version: previousVersion,
            version: updated.current_version,
            version_created: updated.current_version !== previousVersion,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;

    const versionCreated = data.version_created as boolean | undefined;
    const summary = versionCreated
      ? `Updated attachment "${data.attachment_id}" from v${data.previous_version} to v${data.version}`
      : `Updated attachment "${data.attachment_id}" metadata (no content change)`;

    return [
      {
        ...result,
        data: {
          summary,
          attachment_id: data.attachment_id,
          type: data.type,
          previous_version: data.previous_version,
          version: data.version,
          version_created: data.version_created,
        },
      },
    ];
  },
});
