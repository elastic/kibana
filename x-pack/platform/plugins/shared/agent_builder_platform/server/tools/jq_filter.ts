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
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { runJq } from './jq';

const jqFilterSchema = z.object({
  filestore_path: z
    .string()
    .describe(
      'Path to the stored data in the filestore, as returned by execute_esql when preview_rows is set.'
    ),
  expression: z
    .string()
    .describe(
      'A jq expression to apply to the stored data. Examples: ".[] | select(.status == \\"error\\")", "map(.message)", ".[0:10]"'
    ),
});

export const jqFilterTool = (): BuiltinToolDefinition<typeof jqFilterSchema> => ({
  id: platformCoreTools.jqFilter,
  type: ToolType.builtin,
  description: `Apply a jq filter expression to data previously stored in the filestore by execute_esql.

## Usage

Use this tool after calling \`${platformCoreTools.executeEsql}\` with \`preview_rows\` set.
That call returns a \`filestore_path\` pointing to the full result set.
Pass that path here along with a jq expression to extract exactly the rows or fields you need.

## jq expression examples

- Filter rows: \`.[] | select(.status == "error")\`
- Extract a field from every row: \`map(.message)\`
- First 10 rows: \`.[0:10]\`
- Count rows: \`length\`
- Sort and take top 5: \`sort_by(.timestamp) | reverse | .[0:5]\`

The input to the jq expression is the full array of row objects (each column mapped to its value).`,
  schema: jqFilterSchema,
  handler: async ({ filestore_path, expression }, { filestore }) => {
    const entry = await filestore.read(filestore_path);

    if (!entry) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `No data found at filestore path: ${filestore_path}. Make sure to call execute_esql with preview_rows set first.`,
            },
          },
        ],
      };
    }

    let result: unknown[];
    try {
      result = runJq(expression, entry.content.raw);
    } catch (err) {
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: {
              message: `jq expression failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          },
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            expression,
            source_path: filestore_path,
            result,
            result_count: result.length,
          },
        },
      ],
    };
  },
  tags: [],
});
