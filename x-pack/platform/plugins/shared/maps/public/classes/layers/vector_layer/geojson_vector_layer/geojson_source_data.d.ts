import type { FeatureCollection } from 'geojson';
import type { Timeslice, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import type { DataRequestContext } from '../../../../actions';
import type { IVectorSource } from '../../../sources/vector_source';
import type { DataRequest } from '../../../util/data_request';
export declare function syncGeojsonSourceData({ layerId, layerName, prevDataRequest, requestMeta, syncContext, source, getUpdateDueToTimeslice, }: {
    layerId: string;
    layerName: string;
    prevDataRequest: DataRequest | undefined;
    requestMeta: VectorSourceRequestMeta;
    syncContext: DataRequestContext;
    source: IVectorSource;
    getUpdateDueToTimeslice: (timeslice?: Timeslice) => boolean;
}): Promise<{
    refreshed: boolean;
    featureCollection: FeatureCollection;
}>;
