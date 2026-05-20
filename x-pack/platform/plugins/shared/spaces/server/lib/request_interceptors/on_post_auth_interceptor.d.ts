import type { CoreSetup, Logger } from '@kbn/core/server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { SpacesServiceStart } from '../../spaces_service';
export interface OnPostAuthInterceptorDeps {
    http: CoreSetup['http'];
    getFeatures: () => Promise<FeaturesPluginStart>;
    getSpacesService: () => SpacesServiceStart;
    log: Logger;
}
export declare function initSpacesOnPostAuthRequestInterceptor({ getFeatures, getSpacesService, log, http, }: OnPostAuthInterceptorDeps): void;
