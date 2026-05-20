import type { LayerDescriptor } from '../../common/descriptor_types';
import type { CreateLayerDescriptorParams } from '../classes/sources/es_search_source';
export declare const createLayerDescriptors: {
    createSecurityLayerDescriptors(indexPatternId: string, indexPatternTitle: string): Promise<LayerDescriptor[]>;
    createBasemapLayerDescriptor(): Promise<LayerDescriptor | null>;
    createESSearchSourceLayerDescriptor(params: CreateLayerDescriptorParams): Promise<LayerDescriptor>;
};
