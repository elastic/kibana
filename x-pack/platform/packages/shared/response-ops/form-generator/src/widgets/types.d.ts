import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { z } from '@kbn/zod/v4';
import type { FormConfig, ResolvedMetaFunctions } from '../form';
export declare enum WidgetType {
    Text = "text",
    Password = "password",
    Select = "select",
    FormFieldset = "formFieldset",
    Hidden = "hidden",
    Object = "object",
    FileUpload = "fileUpload"
}
export interface BaseWidgetProps<TSchema extends z.ZodType = z.ZodType, TEuiFieldProps = Record<string, unknown>, TOption = unknown> {
    path: string;
    schema: TSchema;
    formConfig: FormConfig;
    meta: ResolvedMetaFunctions;
    fieldConfig: {
        label?: string;
        validations: [
            {
                validator: (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc<any>>;
            }
        ];
        defaultValue?: z.infer<TSchema>;
    } & Record<string, unknown>;
    fieldProps: {
        euiFieldProps: TEuiFieldProps;
    } & Record<string, unknown>;
    options?: TOption[];
}
export type BaseWidgetPropsWithOptions<TSchema extends z.ZodType = z.ZodType, TEuiFieldProps = Record<string, unknown>, TOption = Record<string, unknown>> = BaseWidgetProps<TSchema, TEuiFieldProps, TOption> & {
    options: TOption[];
};
