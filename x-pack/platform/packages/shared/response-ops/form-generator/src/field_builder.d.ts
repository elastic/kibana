import React from 'react';
import type { z } from '@kbn/zod/v4';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { FormConfig, ResolvedMetaFunctions } from './form';
export type FieldValidationFunc = (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any>>;
export interface FieldDefinition {
    path: string;
    validate: FieldValidationFunc;
    schema: z.ZodType;
    formConfig: FormConfig;
    options?: Record<string, unknown>;
    defaultValue?: unknown;
    isOptional?: boolean;
}
interface GetFieldFromSchemaProps {
    schema: z.ZodType;
    path: string;
    formConfig: FormConfig;
    meta: ResolvedMetaFunctions;
}
export declare const getFieldFromSchema: ({ schema: outerSchema, path, formConfig, meta, }: GetFieldFromSchemaProps) => {
    path: string;
    schema: z.ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>;
    formConfig: FormConfig;
    defaultValue: unknown;
    isOptional: boolean;
    validate: (data: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFuncArg<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<ValidationFunc>;
};
export declare const getFieldsFromSchema: <T extends z.ZodRawShape>({ schema, rootPath, formConfig, meta, }: {
    schema: z.ZodObject<T>;
    rootPath?: string;
    formConfig: FormConfig;
    meta?: ResolvedMetaFunctions;
}) => FieldDefinition[];
interface RenderFieldProps {
    field: FieldDefinition;
    meta?: ResolvedMetaFunctions;
}
export declare const renderField: ({ field, meta }: RenderFieldProps) => React.JSX.Element;
export {};
