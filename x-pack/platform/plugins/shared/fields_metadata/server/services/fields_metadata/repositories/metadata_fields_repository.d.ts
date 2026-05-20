import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import type { MetadataFieldName } from '../../../../common/fields_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { AnyFieldName, TMetadataFields } from '../../../../common';
interface MetadataFieldsRepositoryDeps {
    metadataFields: TMetadataFields;
}
interface FindOptions {
    fieldNames?: MetadataFieldName[];
}
export declare class MetadataFieldsRepository {
    private readonly metadataFields;
    private constructor();
    getByName(fieldName: MetadataFieldName | AnyFieldName): FieldMetadata | undefined;
    find({ fieldNames }?: FindOptions): FieldsMetadataDictionary;
    static create({ metadataFields }: MetadataFieldsRepositoryDeps): MetadataFieldsRepository;
}
export {};
