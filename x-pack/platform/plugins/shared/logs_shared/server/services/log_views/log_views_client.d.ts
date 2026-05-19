import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { LogView, LogViewAttributes, LogViewReference, LogViewsStaticConfig, ResolvedLogView } from '../../../common/log_views';
import { NotFoundError } from './errors';
import type { ILogViewsClient, LogViewFallbackHandler } from './types';
type DataViewsService = ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>;
export declare class LogViewsClient implements ILogViewsClient {
    private readonly logger;
    private readonly dataViews;
    private readonly logSourcesService;
    private readonly savedObjectsClient;
    private readonly logViewFallbackHandler;
    private readonly internalLogViews;
    private readonly config;
    static errors: {
        NotFoundError: typeof NotFoundError;
    };
    constructor(logger: Logger, dataViews: DataViewsService, logSourcesService: Promise<LogSourcesService>, savedObjectsClient: SavedObjectsClientContract, logViewFallbackHandler: LogViewFallbackHandler, internalLogViews: Map<string, LogView>, config: LogViewsStaticConfig);
    getLogView(logViewId: string): Promise<LogView>;
    getInternalLogView(logViewId: string): Promise<LogView>;
    getResolvedLogView(logViewReference: LogViewReference): Promise<ResolvedLogView>;
    putLogView(logViewId: string, logViewAttributes: Partial<LogViewAttributes>): Promise<LogView>;
    resolveLogView(logViewId: string, logViewAttributes: LogViewAttributes): Promise<ResolvedLogView>;
    private getSavedLogView;
    private getLogViewFromLogsSharedSourceConfiguration;
    private resolveLogViewId;
    private getNewestSavedLogViewId;
}
export {};
