import type { StyleMetaDescriptor, RangeFieldMeta, Category } from '../../../../common/descriptor_types';
export declare class StyleMeta {
    private readonly _descriptor;
    constructor(styleMetaDescriptor: StyleMetaDescriptor | null | undefined);
    getRangeFieldMetaDescriptor(fieldName: string): RangeFieldMeta | null;
    getCategoryFieldMetaDescriptor(fieldName: string): Category[];
    isPointsOnly(): boolean;
    isLinesOnly(): boolean;
    isPolygonsOnly(): boolean;
}
