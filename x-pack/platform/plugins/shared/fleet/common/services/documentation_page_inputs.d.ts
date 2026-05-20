import type { PackageInfo, RegistryInput, RegistryStream } from '../types';
export type DocumentationPageInputStream = RegistryStream & {
    data_stream: {
        type?: string;
        dataset: string;
    };
};
export type DocumentationPageInput = RegistryInput & {
    key: string;
    policy_template: string;
    streams: DocumentationPageInputStream[];
};
/**
 * Inputs and streams for the Integrations package detail "API reference" tab.
 * Keys and stream resolution match package policy validation and template generation.
 */
export declare const getDocumentationPageInputs: (packageInfo: PackageInfo, integration?: string | null) => DocumentationPageInput[];
