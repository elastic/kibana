import { ToolType, type ToolDefinition, type ToolDefinitionWithSchema } from '../definition';
/**
 * Current configuration schema version for persisted ES|QL tools.
 */
export declare const ESQL_CONFIG_SCHEMA_VERSION = 2;
/**
 * Common ES Field Types
 */
export declare enum EsqlToolFieldType {
    INTEGER = "integer",
    STRING = "string",
    FLOAT = "float",
    BOOLEAN = "boolean",
    DATE = "date",
    ARRAY = "array"
}
export type EsqlToolFieldTypes = `${EsqlToolFieldType}`;
/**
 * Valid types for parameter values and default values
 */
export type EsqlToolParamValue = string | number | boolean | string[] | number[];
export interface EsqlToolParam {
    /**
     * The data types of the parameter. Must be one of these
     */
    type: EsqlToolFieldTypes;
    /**
     * Description of the parameter's purpose or expected values.
     */
    description: string;
    /**
     * Whether the parameter is optional.
     */
    optional?: boolean;
    /**
     * Default value for the parameter when it's optional and not provided.
     * Must be compatible with the parameter's type (see EsqlToolParamValue).
     */
    defaultValue?: EsqlToolParamValue;
}
export type EsqlToolConfig = {
    query: string;
    params: Record<string, EsqlToolParam>;
};
export type EsqlToolDefinition = ToolDefinition<ToolType.esql, EsqlToolConfig>;
export type EsqlToolDefinitionWithSchema = ToolDefinitionWithSchema<ToolType.esql, EsqlToolConfig>;
export declare function isEsqlTool(tool: ToolDefinitionWithSchema): tool is EsqlToolDefinitionWithSchema;
export declare function isEsqlTool(tool: ToolDefinition): tool is EsqlToolDefinition;
