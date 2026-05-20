import type { PluginInitializerContext } from '@kbn/core/server';
export type { FieldsMetadataServerSetup, FieldsMetadataServerStart } from './types';
export type { IntegrationName, DatasetName, ExtractedIntegrationFields, ExtractedDatasetFields, IFieldsMetadataClient, } from './services/fields_metadata/types';
export declare function plugin(context: PluginInitializerContext): Promise<import("./plugin").FieldsMetadataPlugin>;
