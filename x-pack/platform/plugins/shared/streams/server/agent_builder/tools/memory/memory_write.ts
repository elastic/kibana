/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { platformStreamsMemoryTools } from './tool_ids';
import { getUserFromRequest } from './get_user_from_request';
import type { MemoryToolsOptions } from './types';

const memoryWriteSchema = z.object({
  name: z
    .string()
    .describe(
      'Unique name for the page (e.g. "nginx-overview"). Creates a new page or overwrites the existing one with this name.'
    ),
  title: z.string().describe('Human-readable title for the page.'),
  content: z.string().describe('Full markdown content for the page.'),
  categories: z
    .array(z.string())
    .optional()
    .describe(
      'Categories this page belongs to (e.g. ["services", "streams/logs-otel"]). A page can belong to multiple categories.'
    ),
  references: z
    .array(z.string())
    .optional()
    .describe('IDs of other memory pages referenced from this content.'),
  tags: z.array(z.string()).optional().describe('Optional classification tags.'),
  change_summary: z.string().optional().describe('Human-readable description of what was changed.'),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      'Required: your confidence in the accuracy of this page content, 0–100. ' +
        '100 = verified fact you are certain of; 50 = plausible but unconfirmed; 0 = pure speculation or hypothesis. ' +
        'Be honest — this helps readers calibrate how much to trust the page. ' +
        'Examples: 90 for something you directly observed, 60 for something inferred, 20 for an educated guess.'
    ),
});

export const createMemoryWriteTool = ({
  getMemoryService,
  getSecurity,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryWriteSchema> => ({
  id: platformStreamsMemoryTools.memoryWrite,
  type: ToolType.builtin,
  description:
    'Create a new memory page or overwrite an existing one by name. ' +
    'For surgical edits to existing pages, prefer memory_patch instead. ' +
    'Use this for new pages or full rewrites. Pages can belong to multiple categories.',
  schema: memoryWriteSchema,
  tags: ['memory'],
  confirmation: { askUser: 'never' },
  handler: async (
    { name, title, content, categories, references, tags, change_summary: changeSummary, confidence },
    context
  ) => {
    const memoryService = getMemoryService(context.esClient.asCurrentUser);
    const { request, esClient } = context;
    const { username: user } = await getUserFromRequest({
      request,
      security: getSecurity(),
      esClient: esClient.asCurrentUser,
    });

    try {
      // Check if page exists with this name
      const existing = await memoryService.getByName({ name });

      if (existing) {
        // Overwrite existing page
        const updated = await memoryService.update({
          id: existing.id,
          title,
          content,
          categories,
          references,
          tags,
          user,
          changeSummary: changeSummary ?? `Overwrote page "${name}"`,
          confidence,
        });
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                id: updated.id,
                name: updated.name,
                version: updated.version,
                created: false,
              },
            },
          ],
        };
      }

      // Create new page
      const created = await memoryService.create({
        name,
        title,
        content,
        categories,
        references,
        tags,
        user,
        confidence,
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              id: created.id,
              name: created.name,
              version: created.version,
              created: true,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory write failed: ${(error as Error).message}`,
            metadata: { name },
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;
    const action = data.created ? 'Created' : 'Updated';
    return [
      {
        ...result,
        data: {
          summary: `${action} memory page "${data.name}" (v${data.version})`,
          id: data.id,
          name: data.name,
          version: data.version,
        },
      },
    ];
  },
});
