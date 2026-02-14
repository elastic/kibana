/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID } from '@kbn/management-settings-ids';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { extractTextContent } from '@kbn/agent-builder-genai-utils/langchain';
import { SCRIPT_PANEL_SYSTEM_PROMPT, getUserPrompt } from './prompt';

/** Attachment type for script panel configurations */
const SCRIPT_PANEL_ATTACHMENT_TYPE = 'script_panel';

/** Shape of stored script panel data */
interface ScriptPanelAttachmentData {
  script_code: string;
  title: string;
  description: string;
  esql?: string;
}

const createScriptPanelSchema = z.object({
  description: z.string().describe('A natural language description of the desired panel visualization and behavior.'),
  esql: z.string().optional().describe('(optional) An ES|QL query to use for data fetching. If not provided, generate an appropriate query based on the description.'),
  attachment_id: z.string().optional().describe('(optional) ID of an existing script panel attachment to update.'),
  title: z.string().optional().describe('(optional) Title for the panel.'),
});

export const createScriptPanelTool = (): BuiltinToolDefinition<typeof createScriptPanelSchema> => {
  return {
    id: platformCoreTools.createScriptPanel,
    type: ToolType.builtin,
    description: `Create or update a custom script panel for a Kibana dashboard.

This tool generates JavaScript code that runs in a sandboxed iframe within the dashboard.
The generated code can:
- Fetch data using ES|QL queries (respecting dashboard time range and filters)
- Render custom HTML visualizations
- Respond to panel resize events

Use this tool when you need:
- Custom visualizations not available in standard chart types
- Dynamic computed displays (counters, status indicators, custom tables)
- Specialized formatting or interactivity

The generated code has access to a limited Kibana API:
- \`Kibana.esql.query()\` - Execute ES|QL queries
- \`Kibana.panel.getSize()\` / \`Kibana.panel.onResize()\` - Panel dimensions
- \`Kibana.render.setContent()\` / \`Kibana.render.setError()\` - Display output
- \`Kibana.log.info/warn/error()\` - Logging

Security: Code runs in a fully sandboxed iframe with no network access and no access to Kibana internals.`,
    schema: createScriptPanelSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ uiSettings }) => {
        const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID);
        return { status: enabled ? 'available' : 'unavailable' };
      },
    },
    tags: [],
    handler: async (
      { description, esql, attachment_id: attachmentId, title },
      { logger, modelProvider, attachments, events }
    ) => {
      try {
        // Step 1: Load existing code if updating
        let existingCode: string | undefined;
        if (attachmentId) {
          const existingAttachment = attachments.getAttachmentRecord(attachmentId);
          if (existingAttachment) {
            const latestVersion = getLatestVersion(existingAttachment);
            const data = latestVersion?.data as ScriptPanelAttachmentData | undefined;
            if (data?.script_code) {
              existingCode = data.script_code;
              logger.debug(`Loaded existing script panel code from attachment ${attachmentId}`);
            }
          } else {
            logger.warn(`Attachment ${attachmentId} not found, creating new script panel`);
          }
        }

        // Step 2: Generate code using LLM
        const model = await modelProvider.getDefaultModel();
        
        events.reportProgress('Generating script panel code...');

        const userPrompt = getUserPrompt({ description, esqlQuery: esql, existingCode });
        
        const response = await model.chatModel.invoke([
          { role: 'system', content: SCRIPT_PANEL_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ]);

        // Extract the generated code from the response
        let generatedCode = extractTextContent(response);

        // Clean up the code if it's wrapped in markdown code blocks
        generatedCode = generatedCode
          .replace(/^```(?:javascript|js)?\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();

        if (!generatedCode) {
          throw new Error('Failed to generate script panel code');
        }

        logger.debug(`Generated script panel code: ${generatedCode.length} characters`);

        // Step 3: Store as attachment
        const scriptPanelData: ScriptPanelAttachmentData = {
          script_code: generatedCode,
          title: title ?? `Script Panel: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`,
          description,
          esql,
        };

        let resultAttachmentId: string | undefined;
        let version: number | undefined;
        let isUpdate = false;

        try {
          if (attachmentId && attachments.getAttachmentRecord(attachmentId)) {
            const updated = await attachments.update(attachmentId, {
              data: scriptPanelData,
              description: scriptPanelData.title,
            });
            resultAttachmentId = attachmentId;
            version = updated?.current_version ?? 1;
            isUpdate = true;
            logger.debug(`Updated script panel attachment ${attachmentId} to version ${version}`);
          } else {
            const newAttachment = await attachments.add({
              type: SCRIPT_PANEL_ATTACHMENT_TYPE,
              data: scriptPanelData,
              description: scriptPanelData.title,
            });
            resultAttachmentId = newAttachment.id;
            version = newAttachment.current_version;
            logger.debug(`Created new script panel attachment ${resultAttachmentId}`);
          }
        } catch (attachmentError) {
          // Attachment creation is optional
          logger.warn(
            `Could not create script panel attachment: ${
              attachmentError instanceof Error ? attachmentError.message : String(attachmentError)
            }`
          );
        }

        return {
          results: [
            {
              type: ToolResultType.scriptPanel,
              tool_result_id: getToolResultId(),
              data: {
                script_code: generatedCode,
                title: scriptPanelData.title,
                description,
                esql,
                query: description,
                ...(resultAttachmentId && { attachment_id: resultAttachmentId }),
                ...(version !== undefined && { version }),
                ...(isUpdate && { is_update: isUpdate }),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in create_script_panel tool: ${errorMessage}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create script panel: ${errorMessage}`,
                metadata: { description, esql, title },
              },
            },
          ],
        };
      }
    },
  };
};
