/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createSmlSearchTool } from './sml_search';
import { createSmlAttachTool } from './sml_attach';
import type { SmlToolsOptions } from './types';

export type { SmlToolsOptions } from './types';

/**
 * All SML tool IDs.
 */
export const smlToolIds = [platformCoreTools.smlSearch, platformCoreTools.smlAttach] as const;

/**
 * Creates all SML tools with the given options.
 */
export const createSmlTools = (options: SmlToolsOptions): BuiltinToolDefinition<any>[] => {
  return [createSmlSearchTool(options), createSmlAttachTool(options)];
};
