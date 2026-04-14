import React from 'react';
import type { z } from '@kbn/zod/v4';
import { type MetaFunctions, type GetMetaFn, type SetMetaFn } from './meta_types';
export interface FormConfig {
    disabled?: boolean;
    isEdit?: boolean;
}
export interface GenerateFormFieldsParams<TSchema extends z.ZodObject<z.ZodRawShape>> {
    schema: TSchema;
    formConfig?: FormConfig;
    /**
     * Optional meta functions to use for accessing schema metadata.
     * When provided, these functions will be used instead of the default ones.
     *
     * This is useful when your schema was created using a different Zod instance
     * than the form generator uses internally (e.g., due to webpack module duplication).
     * By passing the same getMeta/setMeta functions that were used when
     * creating the schema, you ensure metadata is correctly retrieved.
     *
     * @example
     * // Import from the same module that created the schema
     *
     * const zodSchema = fromConnectorSpecSchema(jsonSchema);
     * generateFormFields({
     *   schema: zodSchema,
     *   metaFunctions: { getMeta, setMeta },
     * });
     */
    metaFunctions?: Partial<MetaFunctions>;
}
/**
 * Resolved meta functions used internally.
 * Exported for use by field_builder and other internal modules.
 */
export interface ResolvedMetaFunctions {
    getMeta: GetMetaFn;
    setMeta: SetMetaFn;
}
export declare function generateFormFields<TSchema extends z.ZodObject<z.ZodRawShape>>({ schema, formConfig, metaFunctions, }: GenerateFormFieldsParams<TSchema>): React.JSX.Element;
