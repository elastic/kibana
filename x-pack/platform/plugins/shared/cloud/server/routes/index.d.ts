import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { CloudRequestHandlerContext } from './types';
export interface RouteOptions {
    logger: Logger;
    router: IRouter<CloudRequestHandlerContext>;
    elasticsearchUrl?: string;
}
export declare function defineRoutes(opts: RouteOptions): void;
