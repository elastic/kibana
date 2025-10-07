/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const dataViewExplorerSchema = z.object({
  query: z.string().describe('A natural language query to infer which data views to use.'),
  limit: z
    .number()
    .optional()
    .describe('(optional) Limit the max number of data views to return. Defaults to 1.'),
  pattern: z
    .string()
    .optional()
    .describe('(optional) Pattern to filter data views by title. Defaults to all data views.'),
});

export const dataViewExplorerTool = (): BuiltinToolDefinition<typeof dataViewExplorerSchema> => {
  return {
    id: platformCoreTools.dataViewExplorer,
    type: ToolType.builtin,
    description: `Find relevant Kibana data views based on a natural language query.

The 'pattern' parameter can be used to filter data views by a specific title pattern, e.g. 'logs*'.
This should *only* be used if you know what you're doing (e.g. if the user explicitly specified a pattern).
Otherwise, leave it empty to search against all data views.

*Example:*
User: "Show me my web server logs"
You: call tool 'dataview_explorer' with { query: 'data views for web server logs' }
Tool result: [{ id: 'abc-123', title: 'logs-nginx*', reason: 'Data view for nginx web server logs' }]
`,
    schema: dataViewExplorerSchema,
    handler: async (
      { query: nlQuery, pattern, limit = 1 },
      { dataViewsService, modelProvider, logger }
    ) => {
      logger.debug(
        `dataview_explorer tool called with query: ${nlQuery}, pattern: ${pattern}, limit: ${limit}`
      );

      const model = await modelProvider.getDefaultModel();

      // Get all data views
      let dataViews = await dataViewsService.getIdsWithTitle();

      // Filter by pattern if provided
      if (pattern) {
        const regexPattern = new RegExp(pattern.replace(/\*/g, '.*'));
        dataViews = dataViews.filter((dv) => regexPattern.test(dv.title));
      }

      // If no data views, return empty
      if (dataViews.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                resources: [],
                message: pattern
                  ? `No data views found matching pattern: ${pattern}`
                  : 'No data views found',
              },
            },
          ],
        };
      }

      // Use LLM to select most relevant data views
      const prompt = `Given the following Kibana data views, select the ${limit} most relevant one(s) for this query: "${nlQuery}"

Available data views:
${dataViews.map((dv) => `- ID: ${dv.id}, Title: ${dv.title}`).join('\n')}

Return ONLY a JSON array of objects with the selected data view IDs and a brief reason why each was selected.
Format: [{ "id": "data-view-id", "reason": "brief explanation" }]

Select up to ${limit} data view(s).`;

      try {
        const response = await model.chatModel.invoke([['user', prompt]]);
        const content =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Extract JSON from markdown code blocks or plain text
        const jsonMatch =
          content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) || content.match(/(\[[\s\S]*?\])/);

        if (!jsonMatch) {
          throw new Error('Failed to parse LLM response');
        }

        const selected = JSON.parse(jsonMatch[1]) as Array<{ id: string; reason: string }>;

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                resources: selected.slice(0, limit).map((item) => {
                  const dv = dataViews.find((d) => d.id === item.id);
                  return {
                    id: item.id,
                    title: dv?.title || 'Unknown',
                    reason: item.reason,
                  };
                }),
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`dataview_explorer LLM selection failed: ${error.message}`);

        // Fallback: return first N data views
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                resources: dataViews.slice(0, limit).map((dv) => ({
                  id: dv.id,
                  title: dv.title,
                  reason: 'Selected by fallback (LLM selection failed)',
                })),
              },
            },
          ],
        };
      }
    },
    tags: [],
  };
};
