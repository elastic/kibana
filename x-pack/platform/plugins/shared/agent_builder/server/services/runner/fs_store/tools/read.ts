/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { EntityStore } from '../entity_store';

const schema = z.object({
  path: z.string().describe('Path of the file to read'),
  version: z
    .number()
    .optional()
    .describe('Version of the file to read. If not specified, latest version is read.'),
  fullContent: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Return full content of the file. Should only be used if accessing the full content is mandatory'
    ),
});

export const readTool = ({
  entityStore,
}: {
  entityStore: EntityStore;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: 'platform.store.read',
    description: `Read an entry in the artifact store`,
    type: ToolType.builtin,
    schema,
    tags: ['store'],
    handler: async ({ path, version, fullContent }, context) => {
      // TODO: handle version

      const entry = await entityStore.get(path);

      if (!entry) {
        return {
          results: [createErrorResult(`Entry '${path}' not found`)],
        };
      }

      const content = entry.content;
      if (!fullContent) {
        // TODO: truncate
      }

      // TODO
      return {
        results: [createOtherResult({ path, content })],
      };
    },
  };
};
