import type { Logger } from '@kbn/core/server';
import type { LogViewsServiceSetup, LogViewsServiceStart, LogViewsServiceStartDeps } from './types';
export declare class LogViewsService {
    private readonly logger;
    private internalLogViews;
    private logViewFallbackHandler;
    private logViewsStaticConfig;
    constructor(logger: Logger);
    setup(): LogViewsServiceSetup;
    start({ dataViews, logsDataAccess, elasticsearch, savedObjects, }: LogViewsServiceStartDeps): LogViewsServiceStart;
}
