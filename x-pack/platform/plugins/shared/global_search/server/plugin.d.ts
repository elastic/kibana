import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
export interface GlobalSearchPluginSetupDeps {
}
export interface GlobalSearchPluginStartDeps {
    licensing: LicensingPluginStart;
}
export declare class GlobalSearchPlugin implements Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps> {
    private readonly config;
    private readonly searchService;
    private searchServiceStart?;
    private licenseChecker?;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup<{}, GlobalSearchPluginStart>): {
        registerResultProvider: (provider: import("./types").GlobalSearchResultProvider) => void;
    };
    start(core: CoreStart, { licensing }: GlobalSearchPluginStartDeps): {
        find: (params: import("../public").GlobalSearchFindParams, options: import("./types").GlobalSearchFindOptions, request: import("@kbn/core/server").KibanaRequest) => import("rxjs").Observable<import(".").GlobalSearchBatchedResults>;
        getSearchableTypes: (request: import("@kbn/core/server").KibanaRequest) => Promise<string[]>;
    };
    stop(): void;
}
