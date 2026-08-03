import type { CreateRegionMapLayerDescriptorParams } from '../../classes/layers/create_region_map_layer_descriptor';
export declare const REGION_MAP_RENDER = "region_map_vis";
export declare const REGION_MAP_VIS_TYPE = "region_map";
export interface RegionMapVisParams {
    colorSchema: string;
    mapZoom: number;
    mapCenter: [number, number];
    selectedLayer: {
        isEMS: boolean;
        id: string | number;
        layerId: string;
    };
    selectedJoinField: {
        name: string;
    };
}
export interface RegionMapVisConfig extends RegionMapVisParams {
    layerDescriptorParams: CreateRegionMapLayerDescriptorParams;
}
