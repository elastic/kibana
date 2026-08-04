import type { AggDescriptor, LayerDescriptor } from '../../../common/descriptor_types';
export interface CreateRegionMapLayerDescriptorParams {
    label: string;
    emsLayerId?: string;
    leftFieldName?: string;
    termsFieldName?: string;
    termsSize?: number;
    colorSchema: string;
    indexPatternId?: string;
    metricAgg: string;
    metricFieldName?: string;
}
export declare function createAggDescriptor(metricAgg: string, metricFieldName?: string): AggDescriptor;
export declare function createRegionMapLayerDescriptor({ label, emsLayerId, leftFieldName, termsFieldName, termsSize, colorSchema, indexPatternId, metricAgg, metricFieldName, }: CreateRegionMapLayerDescriptorParams): LayerDescriptor | null;
