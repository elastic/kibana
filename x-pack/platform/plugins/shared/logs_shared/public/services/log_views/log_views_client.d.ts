import type { HttpStart, IUiSettingsClient } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataView, DataViewLazy } from '@kbn/data-views-plugin/common';
import type { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import type { LogView, LogViewAttributes, LogViewReference, LogViewsStaticConfig, LogViewStatus, ResolvedLogView } from '../../../common/log_views';
import type { ILogViewsClient } from './types';
export declare class LogViewsClient implements ILogViewsClient {
    private readonly dataViews;
    private readonly logSourcesService;
    private readonly http;
    private readonly search;
    private readonly config;
    constructor(dataViews: DataViewsContract, logSourcesService: LogSourcesService, http: HttpStart, search: ISearchGeneric, config: LogViewsStaticConfig);
    getLogView(logViewReference: LogViewReference): Promise<LogView>;
    getResolvedLogView(logViewReference: LogViewReference): Promise<ResolvedLogView<DataView>>;
    unwrapDataViewLazy(resolvedLogViewLazy: ResolvedLogView<DataViewLazy>): Promise<ResolvedLogView<DataView>>;
    getResolvedLogViewStatus(resolvedLogView: ResolvedLogView<DataView>, uiSettings?: IUiSettingsClient): Promise<LogViewStatus>;
    putLogView(logViewReference: LogViewReference, logViewAttributes: Partial<LogViewAttributes>): Promise<LogView>;
    resolveLogView(logViewId: string, logViewAttributes: LogViewAttributes): Promise<ResolvedLogView<DataView>>;
}
