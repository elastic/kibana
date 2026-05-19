import type { ToolDefinition } from '@kbn/agent-builder-common';
import type { CreateToolPayload, UpdateToolPayload } from '../../../common/http_api/tools';
/**
 * Strips fields that aren't part of the create-tool API payload (server-derived or read-only).
 */
export declare const toCreatePayload: <T extends ToolDefinition>(tool: T) => CreateToolPayload;
/**
 * Strips fields that aren't part of the update-tool API payload (immutable or server-derived).
 */
export declare const toUpdatePayload: <T extends ToolDefinition>(tool: T) => UpdateToolPayload;
