import type { JsonSchema, SchemaPropertyInfo } from './types';
/**
 * Get the JSON schema for the rule data, converting from Zod and caching the result
 */
export declare const getJsonSchema: () => JsonSchema;
/**
 * Resolve anyOf/oneOf/allOf to get the actual schema (handles optionals, unions, etc.)
 */
export declare const resolveSchema: (schema: JsonSchema) => JsonSchema;
/**
 * Get JSON schema node at a given path
 */
export declare const getSchemaNode: (path: Array<string | number>) => JsonSchema | undefined;
/**
 * Get the type from a JSON schema
 */
export declare const getSchemaType: (schema: JsonSchema) => SchemaPropertyInfo["type"];
/**
 * Get properties from JSON schema at a given path
 */
export declare const getSchemaProperties: (path: string[]) => SchemaPropertyInfo[];
/**
 * Get schema description at a given path
 */
export declare const getSchemaDescription: (path: string[]) => string | undefined;
/**
 * Get full property info at a given path (for hover)
 */
export declare const getSchemaPropertyInfo: (path: string[]) => {
    type: string;
    description?: string;
    enumValues?: string[];
} | undefined;
/**
 * Get schema type info at a given path (for value completions)
 */
export declare const getSchemaTypeInfo: (path: string[]) => {
    type: string;
    isBoolean: boolean;
    enumValues?: string[];
} | undefined;
