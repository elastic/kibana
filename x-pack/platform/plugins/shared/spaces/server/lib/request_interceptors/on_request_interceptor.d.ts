import type { CoreSetup } from '@kbn/core-lifecycle-server';
export interface OnRequestInterceptorDeps {
    http: CoreSetup['http'];
}
export declare function initSpacesOnRequestInterceptor({ http }: OnRequestInterceptorDeps): void;
