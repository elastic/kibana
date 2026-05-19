import type { Query } from '@kbn/data-plugin/common';
import type { MapExtent } from '../../../../common/descriptor_types';
import type { DataRequestContext } from '../../../actions';
import type { IVectorSource } from '../../sources/vector_source';
export declare function syncBoundsData({ layerId, syncContext, source, sourceQuery, }: {
    layerId: string;
    syncContext: DataRequestContext;
    source: IVectorSource;
    sourceQuery: Query | null;
}): Promise<MapExtent | null>;
