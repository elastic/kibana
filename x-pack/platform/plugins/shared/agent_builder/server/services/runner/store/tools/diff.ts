/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPatch } from 'diff';
import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { filestoreTools } from '@kbn/agent-builder-common/tools';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { FilestoreEntry, IFileStore } from '@kbn/agent-builder-server/runner/filestore';

const schema = z.object({
  path: z.string().describe('Path of the file to diff'),
  from_version: z.number().describe('Source version to diff from'),
  to_version: z.number().describe('Target version to diff to'),
});

export const diffTool = ({
  filestore,
}: {
  filestore: IFileStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: filestoreTools.diff,
    description: `Diff two versions of a file in the filestore`,
    type: ToolType.builtin,
    schema,
    tags: ['filestore'],
    handler: async ({ path, from_version, to_version }, context) => {
      const fromEntry = await filestore.read(path, { version: from_version });
      if (!fromEntry) {
        return {
          results: [
            createErrorResult(`Entry '${path}' not found or missing version ${from_version}`),
          ],
        };
      }

      const toEntry = await filestore.read(path, { version: to_version });
      if (!toEntry) {
        return {
          results: [
            createErrorResult(`Entry '${path}' not found or missing version ${to_version}`),
          ],
        };
      }

      const fromText = getTextContent(fromEntry);
      const toText = getTextContent(toEntry);

      const diffText = createPatch(path, fromText, toText, `v${from_version}`, `v${to_version}`);

      return {
        results: [
          createOtherResult({
            path,
            from_version,
            to_version,
            diff: diffText,
          }),
        ],
      };
    },
  };
};

const getTextContent = (entry: FilestoreEntry): string => {
  return entry.content.plain_text ?? JSON.stringify(entry.content.raw, null, 2);
};
