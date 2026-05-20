import type { Observable } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { InfluencersFilterQuery, MlEntityField } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { SeriesConfigWithMetadata } from '@kbn/ml-common-types/results';
import type { ExplorerChartsData } from '../explorer/explorer_charts/explorer_charts_container_service';
import type { MlApi } from './ml_api_service';
export declare const isSeriesConfigWithMetadata: (arg: unknown) => arg is SeriesConfigWithMetadata;
export declare const DEFAULT_MAX_SERIES_TO_PLOT = 6;
/**
 * Service for retrieving anomaly explorer charts data.
 */
export declare class AnomalyExplorerChartsService {
    private timeFilter;
    private mlApi;
    private _customTimeRange;
    constructor(timeFilter: TimefilterContract, mlApi: MlApi);
    setTimeRange(timeRange: TimeRange): void;
    getTimeBounds(): TimeRangeBounds;
    getCombinedJobs(jobIds: string[]): Promise<CombinedJob[]>;
    getAnomalyData$(jobIds: string[], chartsContainerWidth: number, selectedEarliestMs: number, selectedLatestMs: number, severity: SeverityThreshold[], influencerFilterQuery?: InfluencersFilterQuery, influencers?: MlEntityField[], maxSeries?: number): Observable<ExplorerChartsData>;
}
