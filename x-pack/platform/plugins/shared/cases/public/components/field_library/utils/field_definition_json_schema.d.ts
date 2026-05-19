import { z } from '@kbn/zod/v4';
export declare const FIELD_DEFINITION_SCHEMA_URI = "file:///cases-field-definition-schema.json";
export declare const getFieldDefinitionJsonSchema: () => z.core.JSONSchema.JSONSchema | null;
