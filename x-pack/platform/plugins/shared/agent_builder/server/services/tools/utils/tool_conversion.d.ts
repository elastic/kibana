import { type ZodObject } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolDefinitionWithSchema, ToolDefinition, ToolType } from '@kbn/agent-builder-common';
import type { Runner, ExecutableTool, InternalToolDefinition } from '@kbn/agent-builder-server';
export declare const toExecutableTool: <TConfig extends object = {}, RunInput extends ZodObject<any> = ZodObject<any>>({ tool, runner, request, asInternal, }: {
    tool: InternalToolDefinition<ToolType, TConfig, RunInput>;
    runner: Runner;
    request: KibanaRequest;
    asInternal?: boolean;
}) => ExecutableTool<TConfig, RunInput>;
/**
 * Remove all additional properties from a tool descriptor.
 *
 * Can be used to convert/clean tool registration for public-facing APIs.
 */
export declare const toDescriptorWithSchema: (tool: InternalToolDefinition) => Promise<ToolDefinitionWithSchema>;
export declare const toDescriptor: (tool: InternalToolDefinition) => ToolDefinition;
