/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createCeSearchTool } from './ce_search';
import { createCeAttachTool } from './ce_attach';
import type { CeToolsOptions } from './types';

export type { CeToolsOptions } from './types';

/**
 * All CE tool IDs.
 */
export const ceToolIds = [platformCoreTools.ceSearch, platformCoreTools.ceAttach] as const;

/**
 * Creates all CE tools with the given options.
 */
export const createCeTools = (options: CeToolsOptions): BuiltinToolDefinition<any>[] => {
  return [createCeSearchTool(options), createCeAttachTool(options)];
};
