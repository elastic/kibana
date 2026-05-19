import type { Logger } from '@kbn/core/server';
import type { IRouter } from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
export declare function initIndexingRoutes({ router, logger, getDataPlugin, }: {
    router: IRouter<DataRequestHandlerContext>;
    logger: Logger;
    getDataPlugin: () => Promise<DataPluginStart>;
    securityPlugin?: SecurityPluginStart;
}): void;
