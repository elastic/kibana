import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { MapsAppRegionMapLocatorParams, MapsAppRegionMapLocatorDependencies } from './types';
export declare const MAPS_APP_REGION_MAP_LOCATOR: "MAPS_APP_REGION_MAP_LOCATOR";
export declare class MapsAppRegionMapLocatorDefinition implements LocatorDefinition<MapsAppRegionMapLocatorParams> {
    protected readonly deps: MapsAppRegionMapLocatorDependencies;
    readonly id: "MAPS_APP_REGION_MAP_LOCATOR";
    constructor(deps: MapsAppRegionMapLocatorDependencies);
    readonly getTimeRange: (params: MapsAppRegionMapLocatorParams) => TimeRange | undefined;
    readonly setTimeRange: (params: MapsAppRegionMapLocatorParams, timeRange?: TimeRange) => {
        timeRange: TimeRange | undefined;
        label: string;
        emsLayerId?: string;
        leftFieldName?: string;
        termsFieldName?: string;
        termsSize?: number;
        colorSchema: string;
        indexPatternId?: string;
        metricAgg: string;
        metricFieldName?: string;
        filters?: import("@kbn/es-query").Filter[];
        query?: import("@kbn/es-query").Query;
        hash?: boolean;
    };
    readonly getLocation: (params: MapsAppRegionMapLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}
