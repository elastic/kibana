import type { JSONSchema } from 'zod/v4/core/json-schema';
/**
 * Wraps a JSON schema in an object if not already an object'.
 * Used to make sure the schema will be compatible with structured output mode for LLMs
 */
export declare const wrapJsonSchema: ({ schema, property, description, }: {
    schema: JSONSchema;
    property?: string;
    description?: string;
}) => {
    wrapped: boolean;
    schema: JSONSchema;
};
