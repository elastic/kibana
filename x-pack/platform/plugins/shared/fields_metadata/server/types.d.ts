import type { CoreSetup } from '@kbn/core/server';
import type { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './services/fields_metadata/types';
export type FieldsMetadataPluginCoreSetup = CoreSetup<FieldsMetadataServerPluginStartDeps, FieldsMetadataServerStart>;
export type FieldsMetadataPluginStartServicesAccessor = FieldsMetadataPluginCoreSetup['getStartServices'];
export interface FieldsMetadataServerSetup {
    registerIntegrationFieldsExtractor: FieldsMetadataServiceSetup['registerIntegrationFieldsExtractor'];
    registerIntegrationListExtractor: FieldsMetadataServiceSetup['registerIntegrationListExtractor'];
    registerStreamsFieldsExtractor: FieldsMetadataServiceSetup['registerStreamsFieldsExtractor'];
}
export interface FieldsMetadataServerStart {
    getClient: FieldsMetadataServiceStart['getClient'];
}
export interface FieldsMetadataServerPluginSetupDeps {
}
export interface FieldsMetadataServerPluginStartDeps {
}
