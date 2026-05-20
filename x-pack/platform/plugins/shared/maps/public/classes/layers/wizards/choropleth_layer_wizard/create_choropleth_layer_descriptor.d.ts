export declare function createEmsChoroplethLayerDescriptor({ leftEmsFileId, leftEmsField, rightIndexPatternId, rightTermField, }: {
    leftEmsFileId: string;
    leftEmsField: string;
    rightIndexPatternId: string;
    rightTermField: string;
}): import("../../../../../common/descriptor_types").VectorLayerDescriptor;
export declare function createEsChoroplethLayerDescriptor({ leftIndexPatternId, leftGeoField, leftJoinField, rightIndexPatternId, rightTermField, }: {
    leftIndexPatternId: string;
    leftGeoField: string;
    leftJoinField: string;
    rightIndexPatternId: string;
    rightTermField: string;
}): import("../../../../../common/descriptor_types").VectorLayerDescriptor;
