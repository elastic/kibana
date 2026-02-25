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

const schema = z.object({
  path: z.string().describe('Path of the file to inspect'),
});

export const historyTool = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: filestoreTools.history,
    description: `Get version history for a file in the filestore`,
    type: ToolType.builtin,
    schema,
    tags: ['filestore'],
    handler: async ({ path }, context) => {
      const entry = await filestore.getEntry(path);
      if (!entry) {
        return {
          results: [createErrorResult(`Entry '${path}' not found`)],
        };
      }

      const history = entry.versions.map((version) => ({
        version: version.version,
        version_change: version.metadata.version_change,
      }));

      return {
        results: [createOtherResult({ path, history })],
      };
    },
  };
};
