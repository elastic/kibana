import type { AggDescriptor, LayerDescriptor } from '../../../common/descriptor_types';
export interface CreateTileMapLayerDescriptorParams {
    label: string;
    mapType: string;
    colorSchema: string;
    indexPatternId?: string;
    geoFieldName?: string;
    metricAgg: string;
    metricFieldName?: string;
}
export declare function createAggDescriptor(mapType: string, metricAgg: string, metricFieldName?: string): AggDescriptor;
export declare function createTileMapLayerDescriptor({ label, mapType, colorSchema, indexPatternId, geoFieldName, metricAgg, metricFieldName, }: CreateTileMapLayerDescriptorParams): LayerDescriptor | null;
