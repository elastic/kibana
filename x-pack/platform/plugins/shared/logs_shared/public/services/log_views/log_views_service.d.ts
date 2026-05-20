import type { LogViewsServiceStartDeps, LogViewsServiceSetup, LogViewsServiceStart } from './types';
export declare class LogViewsService {
    private logViewsStaticConfig;
    setup(): LogViewsServiceSetup;
    start({ dataViews, http, search, logSourcesService, }: LogViewsServiceStartDeps): LogViewsServiceStart;
}
