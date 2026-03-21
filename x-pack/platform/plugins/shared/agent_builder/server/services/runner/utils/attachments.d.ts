import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentsService, ExecutableTool } from '@kbn/agent-builder-server/runner';
import type { Runner } from '@kbn/agent-builder-server';
import type { AttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import type { AnyToolTypeDefinition } from '../../tools/tool_types';
import type { AttachmentServiceStart } from '../../attachments';
import type { ToolsServiceStart } from '../../tools';
export declare const createAttachmentsService: ({ attachmentsStart, toolsStart, runner, request, spaceId, }: {
    attachmentsStart: AttachmentServiceStart;
    toolsStart: ToolsServiceStart;
    runner: Runner;
    request: KibanaRequest;
    spaceId: string;
}) => AttachmentsService;
type AttachmentToolConverterFn = (tool: AttachmentBoundedTool) => ExecutableTool;
export declare const createToolConverter: ({ request, spaceId, definitions, runner, }: {
    request: KibanaRequest;
    spaceId: string;
    definitions: AnyToolTypeDefinition[];
    runner: Runner;
}) => AttachmentToolConverterFn;
export {};
