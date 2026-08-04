import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '../../spaces_service';
import type { SpacesPluginStartDeps } from '../../types';
export interface OnPostAuthInterceptorDeps {
    http: CoreSetup['http'];
    getCoreStartServices: CoreSetup<SpacesPluginStartDeps>['getStartServices'];
    getSpacesService: () => SpacesServiceStart;
    log: Logger;
}
export declare function initSpacesOnPostAuthRequestInterceptor({ getCoreStartServices, getSpacesService, log, http, }: OnPostAuthInterceptorDeps): void;
