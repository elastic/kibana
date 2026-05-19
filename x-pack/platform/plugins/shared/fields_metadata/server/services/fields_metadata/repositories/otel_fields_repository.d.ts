import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { AnyFieldName, OtelFieldName } from '../../../../common';
import type { TOtelFields } from '../../../../common/fields_metadata/types';
export interface OtelFieldsRepositoryDeps {
    otelFields: TOtelFields;
}
interface FindOptions {
    fieldNames?: OtelFieldName[];
}
export declare class OtelFieldsRepository {
    private readonly otelFields;
    private constructor();
    getByName(fieldName: OtelFieldName | AnyFieldName): FieldMetadata | undefined;
    find({ fieldNames }?: FindOptions): FieldsMetadataDictionary;
    static create({ otelFields }: OtelFieldsRepositoryDeps): OtelFieldsRepository;
}
export {};
