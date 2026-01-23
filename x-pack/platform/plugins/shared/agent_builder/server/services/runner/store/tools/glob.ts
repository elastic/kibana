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
import type { FileEntry } from '../filesystem';
import { fsToolsNamespace } from '../constants';

const schema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "/**/*.json", "/logs/*.log")'),
});

export const globTool = ({
  fsStore,
}: {
  fsStore: IFileSystemStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: `${fsToolsNamespace}.glob`,
    description: `Find files matching a glob pattern`,
    type: ToolType.builtin,
    schema,
    tags: ['store'],
    handler: async ({ pattern }, context) => {
      const entries = await fsStore.glob(pattern);
      const summaries = entries.map(toSummary);

      return {
        results: [createOtherResult({ pattern, files: summaries })],
      };
    },
  };
};

type FileEntrySummary = Omit<FileEntry, 'type' | 'content'>;

function toSummary(entry: FileEntry): FileEntrySummary {
  return {
    path: entry.path,
    metadata: entry.metadata,
  };
}
