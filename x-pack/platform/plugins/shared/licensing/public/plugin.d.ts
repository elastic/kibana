import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-types';
import type { LicensingPluginSetup, LicensingPluginStart } from './types';
export declare const licensingSessionStorageKey = "xpack.licensing";
/**
 * @public
 * A plugin for fetching, refreshing, and receiving information about the license for the
 * current Kibana instance.
 */
export declare class LicensingPlugin implements Plugin<LicensingPluginSetup, LicensingPluginStart> {
    private readonly storage;
    /**
     * Used as a flag to halt all other plugin observables.
     */
    private stop$;
    /**
     * A function to execute once the plugin's HTTP interceptor needs to stop listening.
     */
    private removeInterceptor?;
    private internalSubscription?;
    private isLicenseExpirationBannerShown?;
    private readonly infoEndpoint;
    private coreStart?;
    private prevSignature?;
    private refresh?;
    private license$?;
    private featureUsage;
    constructor(_context: PluginInitializerContext, storage?: Storage);
    /**
     * Fetch the objectified license and signature from storage.
     */
    private getSaved;
    /**
     * Store the given license and signature in storage.
     */
    private save;
    /**
     * Clear license and signature information from storage.
     */
    private removeSaved;
    setup(core: CoreSetup): {
        refresh: () => Promise<ILicense>;
        license$: Observable<ILicense>;
        featureUsage: import("./services").FeatureUsageServiceSetup;
    };
    start(core: CoreStart): {
        refresh: () => Promise<ILicense>;
        getLicense: () => Promise<ILicense>;
        license$: Observable<ILicense>;
        featureUsage: import("./services").FeatureUsageServiceStart;
    };
    stop(): void;
    private fetchLicense;
    private showExpiredBanner;
}
