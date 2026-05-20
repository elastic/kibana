import { type ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
declare const GENERIC_OBSERVABLE_VALUE_TYPE: "generic";
export declare const normalizeValueType: (observableTypeKey: string) => keyof typeof fieldsConfig.value | typeof GENERIC_OBSERVABLE_VALUE_TYPE;
interface FieldValidationConfig {
    validator: ValidationFunc;
}
export declare const fieldsConfig: {
    value: Record<string, {
        label: string;
        validations: FieldValidationConfig[];
    }>;
    typeKey: {
        validations: {
            validator: (data: import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").ValidationFuncArg<import("@kbn/es-ui-shared-plugin/static/forms/hook_form_lib").FormData, unknown>) => ReturnType<ValidationFunc<any, import("@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types").ERROR_CODE>>;
        }[];
        label: string;
    };
    description: {
        label: string;
    };
};
export {};
