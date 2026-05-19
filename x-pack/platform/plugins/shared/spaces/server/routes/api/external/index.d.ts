import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '../../../spaces_service';
import type { SpacesRouter } from '../../../types';
import type { UsageStatsServiceSetup } from '../../../usage_stats';
export interface ExternalRouteDeps {
    router: SpacesRouter;
    getStartServices: CoreSetup['getStartServices'];
    getSpacesService: () => SpacesServiceStart;
    usageStatsServicePromise: Promise<UsageStatsServiceSetup>;
    log: Logger;
    isServerless: boolean;
    /** Required for {@link initPostSpacesApi} (stateful space create seeds UI settings). */
    packageInfo?: {
        version: string;
        buildNum: number;
    };
}
export declare function initExternalSpacesApi(deps: ExternalRouteDeps): void;
