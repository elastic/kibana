/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFilesystemService } from '@kbn/agent-builder-server/runner';

const schema = z.object({
  path: z.string().describe('Absolute path of the directory to list'),
});

export const createListFilesTool = ({
  filesystemService,
}: {
  filesystemService: IFilesystemService;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: internalTools.listFiles,
    description:
      'List the entries (files and subdirectories) of a directory in the virtual file system (VFS).',
    type: ToolType.builtin,
    schema,
    tags: ['filesystem'],
    handler: async ({ path }) => {
      const fs = filesystemService.getFilesystem();
      try {
        const names = await fs.readdir(path);
        // Resolve type per entry via `stat`. `readdirWithFileTypes` would be
        // nicer but is optional on the IFileSystem contract and MountableFs
        // doesn't implement it.
        const entries = await Promise.all(
          names.map(async (name) => {
            const childPath = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`;
            const stat = await fs.stat(childPath);
            return { name, type: stat.isDirectory ? 'directory' : 'file' };
          })
        );
        return {
          results: [createOtherResult({ path, entries })],
        };
      } catch (err) {
        return {
          results: [createErrorResult(`list_files '${path}': ${(err as Error).message}`)],
        };
      }
    },
  };
};
