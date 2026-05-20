import type { LocatorDefinition } from '@kbn/share-plugin/public';
import type { MapsAppTileMapLocatorParams, MapsAppTileMapLocatorDependencies } from './types';
export declare const MAPS_APP_TILE_MAP_LOCATOR: "MAPS_APP_TILE_MAP_LOCATOR";
export declare class MapsAppTileMapLocatorDefinition implements LocatorDefinition<MapsAppTileMapLocatorParams> {
    protected readonly deps: MapsAppTileMapLocatorDependencies;
    readonly id: "MAPS_APP_TILE_MAP_LOCATOR";
    constructor(deps: MapsAppTileMapLocatorDependencies);
    readonly getLocation: (params: MapsAppTileMapLocatorParams) => Promise<import("@kbn/share-plugin/public").KibanaLocation<object>>;
}
