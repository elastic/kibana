import type { CreateTileMapLayerDescriptorParams } from '../../classes/layers/create_tile_map_layer_descriptor';
export declare const TILE_MAP_RENDER = "tile_map_vis";
export declare const TILE_MAP_VIS_TYPE = "tile_map";
export declare enum MapTypes {
    ScaledCircleMarkers = "Scaled Circle Markers",
    Heatmap = "Heatmap"
}
export interface TileMapVisParams {
    colorSchema: string;
    mapType: MapTypes;
    mapZoom: number;
    mapCenter: [number, number];
}
export interface TileMapVisConfig extends TileMapVisParams {
    layerDescriptorParams: CreateTileMapLayerDescriptorParams;
}
