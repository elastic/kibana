import type { ApplicationStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ConfigProperties } from './dynamic_config/types';
interface ConfigEntry extends ConfigProperties {
    key: string;
}
export * from './dynamic_config/types';
export type Map = Record<string, string>;
export interface ConfigEntryView extends ConfigEntry {
    isValid: boolean;
    validationErrors: string[];
    value: string | number | boolean | null | Map;
}
export type FieldsConfiguration = Record<string, ConfigProperties>;
interface AdaptiveAllocations {
    max_number_of_allocations?: number;
    [key: string]: unknown;
}
interface ProviderConfig {
    adaptive_allocations?: AdaptiveAllocations;
    max_number_of_allocations?: number;
    headers?: Record<string, string>;
    [key: string]: unknown;
}
export interface Config {
    taskType: string;
    taskTypeConfig?: Record<string, unknown>;
    inferenceId: string;
    provider: string;
    providerConfig?: ProviderConfig;
    contextWindowLength?: number;
    temperature?: number;
    headers?: Map;
}
export interface Secrets {
    providerSecrets?: Record<string, unknown>;
}
export interface InferenceProvider {
    service: string;
    name: string;
    task_types: string[];
    logo?: string;
    configurations: FieldsConfiguration;
}
export interface Secrets {
    providerSecrets?: Record<string, unknown>;
}
export declare const INFERENCE_ENDPOINT_INTERNAL_API_VERSION = "1";
export interface InferenceEndpoint {
    config: Config;
    secrets: Secrets;
}
export declare function isMapWithStringValues(value: unknown): value is Map;
export interface InferenceEndpointUiCommonPluginStartDependencies {
    application: ApplicationStart;
    cloud?: CloudStart;
}
