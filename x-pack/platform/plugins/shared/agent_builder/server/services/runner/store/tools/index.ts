/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { IFileSystemStore } from '../store';
import { readTool } from './read';
import { lsTool } from './ls';
import { globTool } from './glob';
import { grepTool } from './grep';

export const getStoreTools = ({
  fsStore,
}: {
  fsStore: IFileSystemStore;
}): BuiltinToolDefinition<any>[] => {
  return [readTool({ fsStore }), lsTool({ fsStore }), globTool({ fsStore }), grepTool({ fsStore })];
};
