import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { GlobalSearchPluginSetup, GlobalSearchPluginStart } from './types';
export interface GlobalSearchPluginSetupDeps {
}
export interface GlobalSearchPluginStartDeps {
    licensing: LicensingPluginStart;
}
export declare class GlobalSearchPlugin implements Plugin<GlobalSearchPluginSetup, GlobalSearchPluginStart, GlobalSearchPluginSetupDeps, GlobalSearchPluginStartDeps> {
    private readonly config;
    private licenseChecker?;
    private readonly searchService;
    constructor(context: PluginInitializerContext);
    setup(core: CoreSetup<{}, GlobalSearchPluginStart>): {
        registerResultProvider: (provider: import("./types").GlobalSearchResultProvider) => void;
    };
    start({ http }: CoreStart, { licensing }: GlobalSearchPluginStartDeps): {
        find: (params: import(".").GlobalSearchFindParams, options: import("./services").GlobalSearchFindOptions) => import("rxjs").Observable<import(".").GlobalSearchBatchedResults>;
        getSearchableTypes: () => Promise<string[]>;
    };
    stop(): void;
}
