/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import { builtinBrowserToolIds, getPageSnapshotSchema } from '@kbn/agent-builder-common';
import { getBuiltinDescription } from './get_description';
import { takeSnapshot } from './snapshot/take_snapshot';
import type { BuiltinToolDeps } from './types';

export const createGetPageSnapshotTool = (
  deps: BuiltinToolDeps
): BrowserToolDefinition<Record<string, never>> => ({
  id: builtinBrowserToolIds.getPageSnapshot,
  description: getBuiltinDescription(builtinBrowserToolIds.getPageSnapshot),
  schema: getPageSnapshotSchema as BrowserToolDefinition<Record<string, never>>['schema'],
  handler: async (_params, { signal }) => {
    if (signal.aborted) {
      throw new Error('aborted');
    }
    return { content: await takeSnapshot(deps) };
  },
});
