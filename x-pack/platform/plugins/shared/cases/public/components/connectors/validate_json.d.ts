import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
export declare const generateJSONValidator: (options?: {
    maxAdditionalFields?: number;
}) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc>;
