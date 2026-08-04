import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';
export type IndexSearchToolConfig = {
    pattern: string;
    row_limit?: number;
    custom_instructions?: string;
};
export type IndexSearchToolDefinition = ToolDefinition<ToolType.index_search, IndexSearchToolConfig>;
export type IndexSearchToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.index_search, IndexSearchToolConfig>;
export declare function isIndexSearchTool(tool: ToolDefinitionWithSchema): tool is IndexSearchToolDefinitionWithSchema;
export declare function isIndexSearchTool(tool: ToolDefinition): tool is IndexSearchToolDefinition;
