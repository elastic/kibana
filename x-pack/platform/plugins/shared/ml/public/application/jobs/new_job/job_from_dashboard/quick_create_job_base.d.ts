import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { estypes } from '@elastic/elasticsearch';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { Filter, Query, DataViewBase } from '@kbn/es-query';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../services/ml_api_service';
import type { CREATED_BY_LABEL } from '../../../../../common/constants/new_job';
interface CreationState {
    success: boolean;
    error?: ErrorType;
}
export interface CreateState {
    jobCreated: CreationState;
    datafeedCreated: CreationState;
    jobOpened: CreationState;
    datafeedStarted: CreationState;
}
export declare class QuickJobCreatorBase {
    protected readonly dataViews: DataViewsContract;
    protected readonly kibanaConfig: IUiSettingsClient;
    protected readonly timeFilter: TimefilterContract;
    protected readonly share: SharePluginStart;
    protected readonly mlApi: MlApi;
    constructor(dataViews: DataViewsContract, kibanaConfig: IUiSettingsClient, timeFilter: TimefilterContract, share: SharePluginStart, mlApi: MlApi);
    protected putJobAndDataFeed({ jobId, datafeedConfig, jobConfig, createdByLabel, start, end, startJob, runInRealTime, dashboard, }: {
        jobId: string;
        datafeedConfig: Datafeed;
        jobConfig: Job;
        createdByLabel: CREATED_BY_LABEL;
        start: number | undefined;
        end: number | undefined;
        startJob: boolean;
        runInRealTime: boolean;
        dashboard?: DashboardApi;
    }): Promise<CreateState>;
    protected combineQueriesAndFilters(dashboard: {
        query: Query;
        filters: Filter[];
    }, vis: {
        query: Query;
        filters: Filter[];
    }, dataView: DataViewBase, layerQuery?: {
        query: Query;
        filters: Filter[];
    }): estypes.QueryDslQueryContainer;
    private createDashboardLink;
    private getCustomUrls;
}
export {};
