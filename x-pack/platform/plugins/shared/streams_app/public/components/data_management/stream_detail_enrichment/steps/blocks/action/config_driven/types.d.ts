import type { DocLinksStart } from '@kbn/core/public';
import type { configDrivenProcessors } from '.';
export interface ConfigDrivenProcessorConfiguration<FormStateT, ProcessorDefinitionT> {
    type: ConfigDrivenProcessorType;
    inputDisplay: string;
    getDocUrl: (docLinks: DocLinksStart) => React.ReactNode;
    defaultFormState: FormStateT;
    convertFormStateToConfig: (formState: FormStateT) => ProcessorDefinitionT;
    convertProcessorToFormState: (processor: ProcessorDefinitionT) => FormStateT;
    fieldConfigurations: FieldConfiguration[];
    fieldOptions: FieldOptions;
}
export interface FieldOptions {
    includeIgnoreFailures: boolean;
    includeIgnoreMissing: boolean;
    includeCondition: boolean;
    fieldHelpText?: string;
    fieldKey: string;
}
export interface FieldConfiguration {
    field: string;
    type: 'string' | 'array' | 'boolean';
    required: boolean;
    label: string;
    helpText?: React.ReactNode;
}
export type ConfigDrivenProcessors = typeof configDrivenProcessors;
export type ConfigDrivenProcessorType = keyof ConfigDrivenProcessors;
export type ConfigDrivenProcessorFormState = ConfigDrivenProcessors[keyof ConfigDrivenProcessors]['defaultFormState'];
