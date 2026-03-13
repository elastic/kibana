/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createOtherResult, createErrorResult } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core/server';
import { MERMAID_CASE_ATTACHMENT_TYPE } from '../../../common/constants/cases';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../../types';
import { getCasesClient } from './helpers';

const addCaseAttachmentSchema = z.object({
  caseId: z.string().describe('The ID of the case to attach the mermaid diagram to.'),
  content: z.string().describe('The mermaid diagram source code (e.g., "graph TD\\n  A-->B").'),
  title: z.string().optional().describe('Optional title for the diagram attachment.'),
});

export const addCaseAttachmentTool = (
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>
): BuiltinToolDefinition<typeof addCaseAttachmentSchema> => {
  return {
    id: platformCoreTools.addCaseAttachment,
    type: ToolType.builtin,
    tags: ['cases'],
    description: `Attaches a mermaid diagram to an existing case. Use this when the user wants to save a diagram to a case for documentation or investigation purposes.

**Parameters:**
- 'caseId': The case ID to attach the diagram to (required)
- 'content': The mermaid diagram source code (required)
- 'title': Optional title for the diagram

**Example:**
- "Attach this diagram to case abc-123": { caseId: "abc-123", content: "graph TD\\n  A-->B", title: "Attack flow" }

Returns confirmation of the attachment creation with the case details.`,
    schema: addCaseAttachmentSchema,
    handler: async ({ caseId, content, title }, { request, logger }) => {
      try {
        const [, pluginsStart] = await coreSetup.getStartServices();

        const casesClientResult = await getCasesClient(pluginsStart, request, logger, null);
        if ('error' in casesClientResult) {
          return casesClientResult.error;
        }

        const { casesClient } = casesClientResult;

        const updatedCase = await casesClient.attachments.add({
          caseId,
          comment: {
            type: MERMAID_CASE_ATTACHMENT_TYPE,
            data: { content, title },
          } as never,
        });

        return {
          results: [
            createOtherResult({
              success: true,
              message: `Mermaid diagram${title ? ` "${title}"` : ''} attached to case "${
                updatedCase.title
              }" (${updatedCase.id})`,
              case_id: updatedCase.id,
              case_title: updatedCase.title,
            }),
          ],
        };
      } catch (error) {
        logger.error(`[Add Case Attachment Tool] Error: ${error}`);
        return {
          results: [
            createErrorResult(
              `Failed to attach mermaid diagram to case ${caseId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            ),
          ],
        };
      }
    },
  };
};
