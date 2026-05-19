import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { EMSSettings } from '@kbn/maps-ems-plugin/server';
import type { MapsXPackConfig } from './config';
import type { StartDeps, SetupDeps } from './types';
export declare class MapsPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
    readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;
    private readonly _logger;
    constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>);
    _initHomeData(home: HomeServerPluginSetup, prependBasePath: (path: string) => string, emsSettings: EMSSettings): void;
    setup(core: CoreSetup<StartDeps>, plugins: SetupDeps): {
        config: import("rxjs").Observable<Readonly<{} & {
            showMapsInspectorAdapter: boolean;
            preserveDrawingBuffer: boolean;
        }>>;
    };
    start(core: CoreStart, plugins: StartDeps): void;
}
