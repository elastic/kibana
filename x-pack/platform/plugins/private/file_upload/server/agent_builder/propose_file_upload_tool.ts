/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  FILE_UPLOAD_ATTACHMENT_TYPE,
  type FileUploadAttachmentData,
} from '@kbn/file-upload-common';

export const PROPOSE_FILE_UPLOAD_TOOL_ID = 'propose_file_upload';

const proposeFileUploadSchema = lazySchema(() =>
  z.object({
    reason: z
      .string()
      .max(1_000)
      .optional()
      .describe('Optional one-line explanation, shown on the card, of why the upload is needed.'),
    suggested_index_name: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Optional name to pre-fill for the new index, e.g. "sales-2026". Lowercase, no spaces. The user can change it.'
      ),
  })
);

export const createProposeFileUploadTool = (): BuiltinSkillBoundedTool<
  typeof proposeFileUploadSchema
> => ({
  id: PROPOSE_FILE_UPLOAD_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Render a file upload card so the user can upload a file (CSV, NDJSON, log, PDF, …) into a new Elasticsearch index from chat. Optionally pass a one-line `reason` and a `suggested_index_name`. On success, render the card by emitting `<render_attachment id="ATTACHMENT_ID" />` on its own line.',
  schema: proposeFileUploadSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ reason, suggested_index_name: suggestedIndexName }, { attachments }) => {
    const data: FileUploadAttachmentData = {
      reason,
      suggested_index_name: suggestedIndexName,
    };

    try {
      const attachment = await attachments.add(
        {
          type: FILE_UPLOAD_ATTACHMENT_TYPE,
          data,
          description: reason ?? 'Upload a file',
        },
        'agent'
      );

      return {
        results: [
          createOtherResult({
            attachment_id: attachment.id,
            version: attachment.current_version,
          }),
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to create the file upload card: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    const [result] = toolReturn.results;
    if (!result || !isOtherResult(result)) {
      return undefined;
    }
    const { attachment_id: attachmentId } = result.data as { attachment_id?: string };
    return [
      {
        ...result,
        data: {
          summary: `Rendered a file upload card as attachment ${attachmentId}.`,
          attachment_id: attachmentId,
        },
      },
    ];
  },
});
