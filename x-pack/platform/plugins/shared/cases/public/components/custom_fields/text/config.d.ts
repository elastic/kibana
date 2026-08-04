import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export declare const getTextFieldConfig: ({ required, label, defaultValue, }: {
    required: boolean;
    label: string;
    defaultValue?: string | null;
}) => FieldConfig<string>;
