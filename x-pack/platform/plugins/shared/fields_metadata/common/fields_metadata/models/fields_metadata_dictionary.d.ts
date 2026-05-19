import type { FieldAttribute, FieldMetadataPlain, PartialFieldMetadataPlain } from '../types';
import type { FieldMetadata } from './field_metadata';
export type FieldsMetadataMap = Record<string, FieldMetadata>;
export declare class FieldsMetadataDictionary {
    private readonly fields;
    private constructor();
    getFields(): FieldsMetadataMap;
    pick(attributes: FieldAttribute[]): Record<string, PartialFieldMetadataPlain>;
    toPlain(): Record<string, FieldMetadataPlain>;
    static create(fields: FieldsMetadataMap): FieldsMetadataDictionary;
}
