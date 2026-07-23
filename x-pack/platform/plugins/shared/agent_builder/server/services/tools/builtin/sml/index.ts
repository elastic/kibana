/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createSmlAttachTool } from './sml_attach';
import type { SmlToolsOptions } from './types';

export type { SmlToolsOptions } from './types';

/**
 * All SML tool IDs.
 *
 * Note: knowledge-item *retrieval* is no longer a bespoke tool. Agents retrieve KIs by
 * running ES|QL as the user against the "Elastic" ai-index (via the generic
 * `platform.core.execute_esql` tool), with Elasticsearch DLS enforcing space + privilege
 * scoping. Only the attach tool remains SML-specific (id -> conversation attachment).
 */
export const smlToolIds = [platformCoreTools.smlAttach] as const;

/**
 * Creates all SML tools with the given options.
 */
export const createSmlTools = (options: SmlToolsOptions): BuiltinToolDefinition<any>[] => {
  return [createSmlAttachTool(options)];
};
