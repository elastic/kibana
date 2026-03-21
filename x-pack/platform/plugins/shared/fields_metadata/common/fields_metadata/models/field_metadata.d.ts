import type { FieldAttribute, FieldMetadataPlain, PartialFieldMetadataPlain } from '../types';
export interface FieldMetadata extends FieldMetadataPlain {
}
export declare class FieldMetadata {
    private constructor();
    pick(props: FieldAttribute[]): PartialFieldMetadataPlain;
    toPlain(): FieldMetadataPlain;
    static create(fieldMetadata: FieldMetadataPlain): FieldMetadata;
    private static toDashedName;
}
