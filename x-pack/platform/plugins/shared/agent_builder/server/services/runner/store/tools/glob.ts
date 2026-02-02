/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { filestoreTools } from '@kbn/agent-builder-common/tools';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { IFileStore, FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';

const schema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g., "/**/*.json", "/logs/*.log")'),
});

export const globTool = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: filestoreTools.glob,
    description: `Find files matching a glob pattern from the filestore`,
    type: ToolType.builtin,
    schema,
    tags: ['filestore'],
    handler: async ({ pattern }, context) => {
      const entries = await filestore.glob(pattern);
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
