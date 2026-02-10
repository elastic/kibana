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
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type {
  IFileStore,
  LsEntry,
  FileEntryMetadata,
} from '@kbn/agent-builder-server/runner/filestore';

const schema = z.object({
  path: z.string().describe('Path of the directory to list'),
  depth: z
    .number()
    .optional()
    .default(1)
    .describe(
      'Level of depth to include (1 = immediate children only, 2 = include children of subdirectories, etc.)'
    ),
});

export const lsTool = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: filestoreTools.ls,
    description: `List files and directories at the given path from the filestore`,
    type: ToolType.builtin,
    schema,
    tags: ['filestore'],
    handler: async ({ path, depth }, context) => {
      const entries = await filestore.ls(path, { depth });
      const summaries = entries.map(stripContent);

      return {
        results: [createOtherResult({ path, entries: summaries })],
      };
    },
  };
};

/** File entry without content - just path and metadata */
interface FileEntrySummary {
  path: string;
  type: 'file';
  metadata: FileEntryMetadata;
}

/** Directory entry with optional children (for nested listing) */
interface DirEntrySummary {
  path: string;
  type: 'dir';
  children?: LsEntrySummary[];
}

type LsEntrySummary = FileEntrySummary | DirEntrySummary;

/**
 * Strip content from entries, keeping only path, type, and metadata.
 * Recursively processes nested children for directories.
 */
function stripContent(entry: LsEntry): LsEntrySummary {
  if (entry.type === 'file') {
    return {
      path: entry.path,
      type: 'file',
      metadata: entry.metadata,
    };
  }

  const summary: DirEntrySummary = {
    path: entry.path,
    type: 'dir',
  };

  if (entry.children && entry.children.length > 0) {
    summary.children = entry.children.map(stripContent);
  }

  return summary;
}
