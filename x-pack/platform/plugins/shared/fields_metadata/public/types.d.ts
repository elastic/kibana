import type { CoreSetup, CoreStart, Plugin as PluginClass } from '@kbn/core/public';
import type { UseFieldsMetadataHook } from './hooks/use_fields_metadata/use_fields_metadata';
import type { FieldsMetadataServiceStart } from './services/fields_metadata';
export interface FieldsMetadataPublicSetup {
}
export interface FieldsMetadataPublicStart {
    getClient: FieldsMetadataServiceStart['getClient'];
    useFieldsMetadata: UseFieldsMetadataHook;
}
export interface FieldsMetadataPublicSetupDeps {
}
export interface FieldsMetadataPublicStartDeps {
}
export type FieldsMetadataClientCoreSetup = CoreSetup<FieldsMetadataPublicStartDeps, FieldsMetadataPublicStart>;
export type FieldsMetadataClientCoreStart = CoreStart;
export type FieldsMetadataClientPluginClass = PluginClass<FieldsMetadataPublicSetup, FieldsMetadataPublicStart, FieldsMetadataPublicSetupDeps, FieldsMetadataPublicStartDeps>;
export type FieldsMetadataPublicStartServicesAccessor = FieldsMetadataClientCoreSetup['getStartServices'];
export type FieldsMetadataPublicStartServices = ReturnType<FieldsMetadataPublicStartServicesAccessor>;
