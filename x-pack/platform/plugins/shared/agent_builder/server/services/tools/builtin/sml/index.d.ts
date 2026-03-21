import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { SmlToolsOptions } from './types';
export type { SmlToolsOptions } from './types';
/**
 * All SML tool IDs.
 */
export declare const smlToolIds: readonly ["platform.core.sml_search", "platform.core.sml_attach"];
/**
 * Creates all SML tools with the given options.
 */
export declare const createSmlTools: (options: SmlToolsOptions) => BuiltinToolDefinition<any>[];
