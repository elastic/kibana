import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { IVectorSource } from '.';
export interface IMvtVectorSource extends IVectorSource {
    getTileUrl(requestMeta: VectorSourceRequestMeta, refreshToken: string, hasLabels: boolean, buffer: number): Promise<string>;
    getTileSourceLayer(): string;
    /**
     * Syncs source specific styling with mbMap this allows custom sources to further style the map layers/filters
     */
    syncSourceStyle?(mbMap: MbMap, getLayerIds: () => string[]): void;
}
