import type { ErrorCause } from '@elastic/elasticsearch/lib/api/types';
import type { Feature } from 'geojson';
import type { StoredEMSVectorTileLayer, StoredHeatmapLayer, StoredLayerGroup, StoredRasterLayer, StoredVectorLayer } from '../../server';
import type { DataRequestDescriptor } from './data_request_descriptor_types';
import type { JoinSourceDescriptor } from '.';
export type { Attribution } from '../../server';
export type JoinDescriptor = {
    leftField?: string;
    right: Partial<JoinSourceDescriptor>;
    error?: string;
};
export type TileMetaFeature = Feature & {
    properties: {
        'hits.total.relation': string;
        'hits.total.value': number;
        [key: string]: number | string | boolean;
    };
};
export type TileError = {
    message: string;
    tileKey: string;
    error?: ErrorCause;
};
interface RuntimeLayerState {
    __dataRequests?: DataRequestDescriptor[];
    __isPreviewLayer?: boolean;
    __trackedLayerDescriptor?: StoredEMSVectorTileLayer | StoredHeatmapLayer | StoredLayerGroup | StoredRasterLayer | StoredVectorLayer;
    __areTilesLoaded?: boolean;
    __tileMetaFeatures?: TileMetaFeature[];
    __tileErrors?: TileError[];
}
export type VectorLayerDescriptor = Omit<StoredVectorLayer, 'joins'> & {
    joins?: JoinDescriptor[];
} & RuntimeLayerState;
export type HeatmapLayerDescriptor = StoredHeatmapLayer & RuntimeLayerState;
export type EMSVectorTileLayerDescriptor = StoredEMSVectorTileLayer & RuntimeLayerState;
export type LayerGroupDescriptor = StoredLayerGroup & RuntimeLayerState;
export type RasterLayerDescriptor = StoredRasterLayer & RuntimeLayerState;
export type LayerDescriptor = VectorLayerDescriptor | HeatmapLayerDescriptor | EMSVectorTileLayerDescriptor | (LayerGroupDescriptor & {
    sourceDescriptor?: {
        type: string;
    };
    style?: {
        type: string;
    };
}) | (RasterLayerDescriptor & {
    style?: {
        type: string;
    };
});
