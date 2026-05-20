import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Config, ConfigEntryView, InferenceProvider } from '../types/types';
import type { OverrideFieldsContentType } from '../types/dynamic_config/types';
export interface TaskTypeOption {
    id: string;
    value: string;
    label: string;
}
export declare const getTaskTypeOptions: (taskTypes: string[]) => TaskTypeOption[];
export declare const generateInferenceEndpointId: (config: Config) => string;
export declare const getNonEmptyValidator: (requiredFieldsSchema: ConfigEntryView[], validationEventHandler: (fieldsWithErrors: ConfigEntryView[]) => void, isSubmitting?: boolean, isSecrets?: boolean) => (...args: Parameters<ValidationFunc>) => ReturnType<ValidationFunc>;
export declare const mapProviderFields: (taskType: string, newProvider: InferenceProvider, fieldOverrides?: OverrideFieldsContentType) => ConfigEntryView[];
