import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';
export type BuiltinToolConfig = {};
export type BuiltinToolDefinition = ToolDefinition<ToolType.builtin, BuiltinToolConfig>;
export type BuiltinToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.builtin, BuiltinToolConfig>;
export declare function isBuiltinTool(tool: ToolDefinitionWithSchema): tool is BuiltinToolDefinitionWithSchema;
export declare function isBuiltinTool(tool: ToolDefinition): tool is BuiltinToolDefinition;
