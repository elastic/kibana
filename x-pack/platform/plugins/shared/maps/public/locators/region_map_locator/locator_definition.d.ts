import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppRegionMapLocatorParams, MapsAppRegionMapLocatorDependencies } from './types';
export declare const MAPS_APP_REGION_MAP_LOCATOR: "MAPS_APP_REGION_MAP_LOCATOR";
export declare class MapsAppRegionMapLocatorDefinition implements LocatorDefinition<MapsAppRegionMapLocatorParams> {
    protected readonly deps: MapsAppRegionMapLocatorDependencies;
    readonly id: "MAPS_APP_REGION_MAP_LOCATOR";
    constructor(deps: MapsAppRegionMapLocatorDependencies);
    readonly getLocation: (params: MapsAppRegionMapLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}
