/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { IFileSystemStore } from '@kbn/agent-builder-server/runner/filesystem';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { fsToolsNamespace } from '../constants';

const schema = z.object({
  pattern: z.string().describe('The pattern to search for'),
  globPattern: z.string().describe('Glob pattern to match files to search in (e.g., "/**/*.json")'),
  context: z
    .number()
    .optional()
    .default(0)
    .describe('Number of lines of context to include before and after each match'),
  fixed: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, treat pattern as literal text. If false (default), treat as regex.'),
});

export const grepTool = ({
  fsStore,
}: {
  fsStore: IFileSystemStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: `${fsToolsNamespace}.grep`,
    description: `Search for text matching a pattern in files`,
    type: ToolType.builtin,
    schema,
    tags: ['store'],
    handler: async ({ pattern, globPattern, context, fixed }, ctx) => {
      const matches = await fsStore.grep(pattern, globPattern, { context, fixed });

      // Transform matches to a simpler format for the response
      const results = matches.map((match) => ({
        path: match.entry.path,
        line: match.line,
        match: match.match,
      }));

      return {
        results: [createOtherResult({ pattern, globPattern, matches: results })],
      };
    },
  };
};
