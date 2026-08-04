import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, TimeRange, Query } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { MapsAppLocator } from '../map_locator/types';
export interface MapsAppRegionMapLocatorParams extends SerializableRecord {
    label: string;
    emsLayerId?: string;
    leftFieldName?: string;
    termsFieldName?: string;
    termsSize?: number;
    colorSchema: string;
    indexPatternId?: string;
    metricAgg: string;
    metricFieldName?: string;
    timeRange?: TimeRange;
    filters?: Filter[];
    query?: Query;
    hash?: boolean;
}
export type MapsAppRegionMapLocator = LocatorPublic<MapsAppRegionMapLocatorParams>;
export interface MapsAppRegionMapLocatorDependencies {
    locator: MapsAppLocator;
}
