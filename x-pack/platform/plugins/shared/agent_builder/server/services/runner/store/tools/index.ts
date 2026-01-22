/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { readTool } from './read';

export const getStoreTools = (): BuiltinToolDefinition<any>[] => {
  return [readTool()];
};
