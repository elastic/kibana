import type { BuiltinToolDefinition, StaticToolRegistration, InternalToolDefinition } from '@kbn/agent-builder-server/tools';
import type { ToolTypeDefinition, BuiltinToolTypeDefinition, ToolDynamicPropsContext } from '../tool_types/definitions';
import type { ToolAvailabilityCache } from './availability_cache';
export declare const convertTool: ({ tool, definition, context, cache, }: {
    tool: StaticToolRegistration;
    definition: ToolTypeDefinition | BuiltinToolTypeDefinition;
    context: ToolDynamicPropsContext;
    cache: ToolAvailabilityCache;
}) => InternalToolDefinition;
export declare const isBuiltinToolRegistration: (tool: StaticToolRegistration) => tool is BuiltinToolDefinition;
