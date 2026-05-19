import type { KibanaRequest } from '@kbn/core/server';
import type { FieldMetadata } from '../../../common/fields_metadata/models/field_metadata';
import type { FieldsMetadataDictionary } from '../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { FieldName, FieldSource } from '../../../common';
import type { IntegrationFieldsExtractor, IntegrationFieldsSearchParams, IntegrationListExtractor, StreamsFieldsExtractor, StreamsFieldsSearchParams } from './repositories/types';
export type * from './repositories/types';
export interface FieldsMetadataServiceStartDeps {
}
export interface FieldsMetadataServiceSetup {
    registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => void;
    registerIntegrationListExtractor: (extractor: IntegrationListExtractor) => void;
    registerStreamsFieldsExtractor: (extractor: StreamsFieldsExtractor) => void;
}
export interface FieldsMetadataServiceStart {
    getClient(request: KibanaRequest): Promise<IFieldsMetadataClient>;
}
export interface GetFieldsMetadataOptions extends Partial<IntegrationFieldsSearchParams>, Partial<StreamsFieldsSearchParams> {
    source?: FieldSource | FieldSource[];
}
export interface FindFieldsMetadataOptions extends GetFieldsMetadataOptions {
    fieldNames?: FieldName[];
}
export interface IFieldsMetadataClient {
    getByName(fieldName: FieldName, params?: GetFieldsMetadataOptions): Promise<FieldMetadata | undefined>;
    find(params: FindFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
    matchesAnyTypeForEventCategory(categories: string[], expectedTypes: string[]): Promise<boolean>;
    getFieldChildren(fieldName: FieldName, params?: GetFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
    /** Root ECS field set names (see ECS field reference). Derived from ECS flat field names only. */
    getECSFieldsets(): Promise<string[]>;
}
