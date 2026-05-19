import type { TileError, TileMetaFeature } from '../../../common/descriptor_types';
export interface TileRequest {
    layerId: string;
    tileUrl: string;
    tileError?: TileError;
    tileMetaFeature?: TileMetaFeature;
    x: number;
    y: number;
    z: number;
}
