import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { AnyFieldName, EcsFieldName } from '../../../../common';
import type { TEcsFields } from '../../../../common/fields_metadata/types';
export interface EcsFieldsRepositoryDeps {
    ecsFields: TEcsFields;
}
interface FindOptions {
    fieldNames?: EcsFieldName[];
}
export declare class EcsFieldsRepository {
    private readonly fieldsDictionary;
    private constructor();
    getByName(fieldName: EcsFieldName | AnyFieldName): FieldMetadata | undefined;
    find({ fieldNames }?: FindOptions): FieldsMetadataDictionary;
    static create({ ecsFields }: EcsFieldsRepositoryDeps): EcsFieldsRepository;
}
export {};
