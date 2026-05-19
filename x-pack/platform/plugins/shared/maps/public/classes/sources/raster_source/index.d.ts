import type { RasterTileSource } from '@kbn/mapbox-gl';
import type { ReactElement } from 'react';
import type { DataRequest } from '../../util/data_request';
import type { ITMSSource } from '../tms_source';
import type { DataRequestMeta } from '../../../../common/descriptor_types';
export interface RasterTileSourceData {
    url: string;
}
export interface IRasterSource extends ITMSSource {
    canSkipSourceUpdate(dataRequest: DataRequest, nextRequestMeta: DataRequestMeta): Promise<boolean>;
    isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean;
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(dataRequest: DataRequest | undefined): ReactElement<any> | null;
}
