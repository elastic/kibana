import type { MapExtent, TileError } from '../../../../common/descriptor_types';
export declare function getErrorCacheTileKey(canonical: {
    x: number;
    y: number;
    z: number;
}): string;
export declare class TileErrorCache {
    private _cache;
    clearLayer(layerId: string, onClear: () => void): void;
    clearTileError(layerId: string | undefined, tileKey: string, onClear: () => void): void;
    hasAny(): boolean;
    hasTileError(layerId: string, tileKey: string): boolean;
    setTileError(layerId: string, tileError: TileError): void;
    getInViewTileErrors(layerId: string, zoom: number, extent: MapExtent): TileError[] | undefined;
}
