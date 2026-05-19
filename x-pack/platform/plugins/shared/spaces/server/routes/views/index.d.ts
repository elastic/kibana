import type { HttpResources, IBasePath, Logger } from '@kbn/core/server';
export interface ViewRouteDeps {
    httpResources: HttpResources;
    basePath: IBasePath;
    logger: Logger;
}
export declare function initSpacesViewsRoutes(deps: ViewRouteDeps): void;
