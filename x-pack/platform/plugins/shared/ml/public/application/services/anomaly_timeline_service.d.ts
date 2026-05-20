import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { InfluencersFilterQuery, MlEntityField } from '@kbn/ml-anomaly-utils';
import type { TimeBucketsInterval } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { MlApi } from './ml_api_service';
import type { ExplorerJob, OverallSwimlaneData, SwimlaneData, ViewBySwimLaneData } from '../explorer/explorer_utils';
/**
 * Service for retrieving anomaly swim lanes data.
 */
export declare class AnomalyTimelineService {
    private timeFilter;
    private mlApi;
    private timeBuckets;
    private _customTimeRange;
    private mlResultsService;
    constructor(timeFilter: TimefilterContract, uiSettings: IUiSettingsClient, mlApi: MlApi);
    static isSwimlaneData(arg: unknown): arg is SwimlaneData;
    static isOverallSwimlaneData(arg: unknown): arg is OverallSwimlaneData;
    setTimeRange(timeRange: TimeRange): void;
    getSwimlaneBucketInterval(selectedJobs: Array<{
        id: string;
        bucketSpanSeconds: number;
    }>, swimlaneContainerWidth: number): TimeBucketsInterval;
    /**
     * Loads overall swim lane data
     * @param selectedJobs
     * @param chartWidth
     */
    loadOverallData(selectedJobs: Array<{
        id: string;
        bucketSpanSeconds: number;
    }>, chartWidth?: number, bucketInterval?: TimeBucketsInterval, overallScore?: SeverityThreshold[]): Promise<OverallSwimlaneData>;
    /**
     * Fetches view by swim lane data.
     *
     * @param fieldValues
     * @param bounds
     * @param selectedJobs
     * @param viewBySwimlaneFieldName
     * @param swimlaneLimit
     * @param perPage
     * @param fromPage
     * @param swimlaneContainerWidth
     * @param influencersFilterQuery
     */
    loadViewBySwimlane(fieldValues: string[], bounds: {
        earliest: number;
        latest: number;
    }, selectedJobs: ExplorerJob[], viewBySwimlaneFieldName: string, swimlaneLimit: number, perPage: number, fromPage: number, swimlaneContainerWidth?: number, influencersFilterQuery?: any, bucketInterval?: TimeBucketsInterval, swimLaneSeverity?: SeverityThreshold[]): Promise<ViewBySwimLaneData | undefined>;
    loadViewByTopFieldValuesForSelectedTime(earliestMs: number, latestMs: number, selectedJobs: ExplorerJob[], viewBySwimlaneFieldName: string, swimlaneLimit: number, perPage: number, fromPage: number, bucketInterval: TimeBucketsInterval, selectionInfluencers: MlEntityField[], influencersFilterQuery: InfluencersFilterQuery, swimLaneSeverity: SeverityThreshold[]): Promise<any[]>;
    private getTimeBounds;
    private processOverallResults;
    private processViewByResults;
}
