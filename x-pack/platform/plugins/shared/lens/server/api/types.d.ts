import type { HttpServiceSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
export type * from './routes/types';
export interface RegisterAPIRoutesArgs {
    http: HttpServiceSetup;
    contentManagement: ContentManagementServerSetup;
    builder: LensConfigBuilder;
    logger: Logger;
    usageCounter: UsageCounter | undefined;
}
export type RegisterAPIRouteFn = (router: VersionedRouter<RequestHandlerContext>, args: Omit<RegisterAPIRoutesArgs, 'http'>) => void;
