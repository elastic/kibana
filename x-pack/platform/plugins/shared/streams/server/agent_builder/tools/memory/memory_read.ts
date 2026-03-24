/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { MemoryToolsOptions } from './types';

const memoryReadSchema = z.object({
  path: z
    .string()
    .optional()
    .describe('Read entry by its wiki path (e.g. "architecture/web-frontend/overview").'),
  id: z.string().optional().describe('Read entry by its UUID.'),
  heading: z
    .string()
    .optional()
    .describe(
      'Only return content under this markdown heading (e.g. "## Key Behaviors"). Case-insensitive.'
    ),
  offset: z
    .number()
    .min(0)
    .optional()
    .describe('Start from this line number (0-indexed). For paginating large entries.'),
  limit: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .describe('Return at most this many lines. Default: all lines.'),
});

const extractHeadings = (content: string): string[] => {
  return content
    .split('\n')
    .filter((line) => /^#{1,6}\s/.test(line))
    .map((line) => line.trim());
};

const extractHeadingSection = (content: string, heading: string): string | undefined => {
  const lines = content.split('\n');
  const headingLower = heading.toLowerCase().replace(/^#+\s*/, '');
  let startIdx = -1;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim().toLowerCase();
      if (startIdx === -1 && title === headingLower) {
        startIdx = i;
        headingLevel = level;
      } else if (startIdx !== -1 && level <= headingLevel) {
        return lines.slice(startIdx, i).join('\n');
      }
    }
  }

  if (startIdx !== -1) {
    return lines.slice(startIdx).join('\n');
  }
  return undefined;
};

export const createMemoryReadTool = ({
  getMemoryService,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryReadSchema> => ({
  id: platformCoreTools.memoryRead,
  type: ToolType.builtin,
  description:
    'Read a specific memory entry by path or ID. Supports targeted reads: ' +
    'request a specific heading section or a line range to avoid loading the full document. ' +
    'Always returns the list of headings and total line count for navigation.',
  schema: memoryReadSchema,
  tags: ['memory'],
  handler: async ({ path, id, heading, offset, limit }, context) => {
    const memoryService = getMemoryService();
    const { spaceId } = context;

    if (!path && !id) {
      return {
        results: [
          createErrorResult({
            message: 'Either "path" or "id" must be provided.',
          }),
        ],
      };
    }

    try {
      const entry = id
        ? await memoryService.get({ id, space: spaceId })
        : await memoryService.getByPath({ path: path!, space: spaceId });

      if (!entry) {
        return {
          results: [
            createErrorResult({
              message: `Memory entry not found: ${path ?? id}`,
            }),
          ],
        };
      }

      let content = entry.content;
      const allHeadings = extractHeadings(content);
      const totalLines = content.split('\n').length;

      // Apply heading filter
      if (heading) {
        const section = extractHeadingSection(content, heading);
        if (!section) {
          return {
            results: [
              createErrorResult({
                message: `Heading "${heading}" not found in entry. Available headings: ${allHeadings.join(
                  ', '
                )}`,
              }),
            ],
          };
        }
        content = section;
      }

      // Apply line range
      const lines = content.split('\n');
      const start = offset ?? 0;
      const end = limit ? Math.min(start + limit, lines.length) : lines.length;
      const slicedLines = lines.slice(start, end);
      content = slicedLines.join('\n');

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              id: entry.id,
              path: entry.path,
              title: entry.title,
              version: entry.version,
              updated_at: entry.updated_at,
              updated_by: entry.updated_by,
              content,
              total_lines: totalLines,
              returned_range: { start, end: start + slicedLines.length },
              headings: allHeadings,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory read failed: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
});
