/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { filestoreTools } from '@kbn/agent-builder-common/tools';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
import {
  estimateTokens,
  truncateTokens,
} from '@kbn/agent-builder-genai-utils/tools/utils/token_count';

const schema = z.object({
  path: z.string().describe('Path of the file to read'),
  raw: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'If true, will return the full, raw content of the file. Only use when context was already accessed, redacted, and you need to access the full version'
    ),
});

const SAFEGUARD_TOKEN_COUNT = 10_000;

export const readTool = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: filestoreTools.read,
    description: `Read the content of a file in the filestore based on its path`,
    type: ToolType.builtin,
    schema,
    tags: ['filestore'],
    handler: async ({ path, raw }) => {
      const entry = await filestore.read(path);
      if (!entry) {
        return {
          results: [createErrorResult(`Entry '${path}' not found`)],
        };
      }

      let content: string | object;
      let truncated = false;
      if (raw) {
        content = entry.content.raw;
      } else {
        content = entry.content.plain_text ?? JSON.stringify(entry.content.raw, undefined, 2);
        const tokenCount = estimateTokens(content);
        if (tokenCount > SAFEGUARD_TOKEN_COUNT) {
          content = truncateTokens(content as string, SAFEGUARD_TOKEN_COUNT);
          truncated = true;
        }
      }

      return {
        results: [createOtherResult({ path, content, truncated })],
      };
    },
  };
};
