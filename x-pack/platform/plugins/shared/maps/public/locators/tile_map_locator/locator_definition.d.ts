import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { MapsAppTileMapLocatorParams, MapsAppTileMapLocatorDependencies } from './types';
export declare const MAPS_APP_TILE_MAP_LOCATOR: "MAPS_APP_TILE_MAP_LOCATOR";
export declare class MapsAppTileMapLocatorDefinition implements LocatorDefinition<MapsAppTileMapLocatorParams> {
    protected readonly deps: MapsAppTileMapLocatorDependencies;
    readonly id: "MAPS_APP_TILE_MAP_LOCATOR";
    constructor(deps: MapsAppTileMapLocatorDependencies);
    readonly getTimeRange: (params: MapsAppTileMapLocatorParams) => TimeRange | undefined;
    readonly setTimeRange: (params: MapsAppTileMapLocatorParams, timeRange?: TimeRange) => {
        timeRange: TimeRange | undefined;
        label: string;
        mapType: string;
        colorSchema: string;
        indexPatternId?: string;
        geoFieldName?: string;
        metricAgg: string;
        metricFieldName?: string;
        filters?: import("@kbn/es-query").Filter[];
        query?: import("@kbn/es-query").Query;
        hash?: boolean;
    };
    readonly getLocation: (params: MapsAppTileMapLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}
