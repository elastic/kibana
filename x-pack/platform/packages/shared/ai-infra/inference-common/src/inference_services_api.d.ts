export declare const SERVICE_SETTINGS = "service_settings";
export declare const TASK_SETTINGS = "task_settings";
export declare enum FieldType {
    STRING = "str",
    INTEGER = "int",
    BOOLEAN = "bool",
    MAP = "map",
    LIST = "list"
}
export type ConfigValue = string | number | boolean | null | Record<string, string> | string[];
export interface ConfigProperties {
    default_value: ConfigValue;
    description: string | null;
    label: string;
    required: boolean;
    sensitive: boolean;
    updatable: boolean;
    type: FieldType;
    supported_task_types: string[];
    location?: typeof SERVICE_SETTINGS | typeof TASK_SETTINGS;
}
export type FieldsConfiguration = Record<string, ConfigProperties>;
export interface InferenceProvider {
    service: string;
    name: string;
    task_types: string[];
    logo?: string;
    configurations: FieldsConfiguration;
}
