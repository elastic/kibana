import type { ZodObject } from '@kbn/zod/v4';
import type { EsqlToolDefinition, ToolDefinition } from '@kbn/agent-builder-common';
import type { IndexSearchToolDefinition, WorkflowToolDefinition } from '@kbn/agent-builder-common/tools';
import type { BuiltinToolDefinition } from '../tools/builtin';
export type BuiltinAttachmentBoundedTool<RunInput extends ZodObject<any> = ZodObject<any>> = Omit<BuiltinToolDefinition<RunInput>, 'tags' | 'availability'>;
type AttBoundToolMixin<T extends ToolDefinition> = Omit<T, 'readonly' | 'tags'>;
export type StaticEsqlAttachmentBoundedTool = AttBoundToolMixin<EsqlToolDefinition>;
export type IndexSearchAttachmentBoundedTool = AttBoundToolMixin<IndexSearchToolDefinition>;
export type WorkflowAttachmentBoundedTool = AttBoundToolMixin<WorkflowToolDefinition>;
/**
 * Definition of a tool which is bounded to an attachment instance.
 *
 * Refer to {@link AttachmentTypeDefinition}.
 */
export type AttachmentBoundedTool<RunInput extends ZodObject<any> = ZodObject<any>> = BuiltinAttachmentBoundedTool<RunInput> | StaticEsqlAttachmentBoundedTool | IndexSearchAttachmentBoundedTool | WorkflowAttachmentBoundedTool;
export {};
