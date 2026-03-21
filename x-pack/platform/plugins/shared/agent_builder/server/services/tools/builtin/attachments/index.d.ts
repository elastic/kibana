import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { AttachmentToolsOptions } from './types';
export type { AttachmentToolsOptions } from './types';
/**
 * All attachment tool IDs.
 */
export declare const attachmentToolIds: readonly [string, string, string, string, string];
/**
 * Creates all attachment tools with the given options.
 */
export declare const createAttachmentTools: (options: AttachmentToolsOptions) => BuiltinToolDefinition<any>[];
