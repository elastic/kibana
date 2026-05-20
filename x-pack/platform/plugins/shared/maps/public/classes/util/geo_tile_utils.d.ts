import type { MapExtent } from '../../../common/descriptor_types';
export interface ESBounds {
    top_left: {
        lon: number;
        lat: number;
    };
    bottom_right: {
        lon: number;
        lat: number;
    };
}
export declare function parseTileKey(tileKey: string): {
    x: number;
    y: number;
    zoom: number;
    tileCount: number;
};
export declare function getTilesForExtent(zoom: number, extent: MapExtent): Array<{
    x: number;
    y: number;
    z: number;
}>;
export declare function getTileKey(lat: number, lon: number, zoom: number): string;
export declare function tile2long(x: number, z: number): number;
export declare function tile2lat(y: number, z: number): number;
export declare function tileToLatitude(y: number, tileCount: number): number;
export declare function tileToLongitude(x: number, tileCount: number): number;
export declare function getTileBoundingBox(tileKey: string): {
    top: number;
    bottom: number;
    left: number;
    right: number;
};
export declare function expandToTileBoundaries(extent: MapExtent, zoom: number): MapExtent;
export declare function isPointInTile(lat: number, lon: number, x: number, y: number, z: number): boolean;
