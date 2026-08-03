import type { Stream } from 'stream';
import type { IncomingHttpHeaders } from 'http';
import type { CoreStart, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
export declare function initMVTRoutes({ router, logger, getCore, }: {
    router: IRouter<DataRequestHandlerContext>;
    logger: Logger;
    getCore: () => Promise<CoreStart>;
}): void;
export declare function sendResponse(response: KibanaResponseFactory, tileStream: Stream | null, headers: IncomingHttpHeaders, statusCode: number): import("@kbn/core/server").IKibanaResponse<any>;
