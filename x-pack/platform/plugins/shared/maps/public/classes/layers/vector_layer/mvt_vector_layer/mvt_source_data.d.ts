import type { VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import type { DataRequest } from '../../../util/data_request';
import type { DataRequestContext } from '../../../../actions';
import type { IMvtVectorSource } from '../../../sources/vector_source';
export interface MvtSourceData {
    tileSourceLayer: string;
    tileMinZoom: number;
    tileMaxZoom: number;
    tileUrl: string;
    refreshToken: string;
    hasLabels: boolean;
    buffer: number;
}
export declare function syncMvtSourceData({ buffer, hasLabels, layerId, layerName, prevDataRequest, requestMeta, source, syncContext, }: {
    buffer: number;
    hasLabels: boolean;
    layerId: string;
    layerName: string;
    prevDataRequest: DataRequest | undefined;
    requestMeta: VectorSourceRequestMeta;
    source: IMvtVectorSource;
    syncContext: DataRequestContext;
}): Promise<void>;
