import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeBucketsInterval } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type { AppStateSelectedCells, ExplorerJob, OverallSwimlaneData } from './explorer_utils';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { MlJobService } from '../services/job_service';
import { StateService } from '../services/state_service';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';
interface SwimLanePagination {
    viewByFromPage: number;
    viewByPerPage: number;
}
export interface TimeDomain {
    min: number;
    max: number;
    minInterval: number;
}
/**
 * Service for managing anomaly timeline state.
 */
export declare class AnomalyTimelineStateService extends StateService {
    private mlJobService;
    private anomalyExplorerUrlStateService;
    private anomalyExplorerCommonStateService;
    private anomalyTimelineService;
    private timefilter;
    private readonly _explorerURLStateCallback;
    private _overallSwimLaneData$;
    private _viewBySwimLaneData$;
    private _swimLaneUrlState$;
    private _containerWidth$;
    private _selectedCells$;
    private _swimLaneSeverity$;
    private _swimLanePagination$;
    private _swimLaneCardinality$;
    private _viewBySwimlaneFieldName$;
    private _viewBySwimLaneOptions$;
    private _topFieldValues$;
    private _isOverallSwimLaneLoading$;
    private _isViewBySwimLaneLoading$;
    private _swimLaneBucketInterval$;
    private _timeBounds$;
    private _refreshSubject$;
    /** Time domain of the currently active swim lane */
    readonly timeDomain$: Observable<TimeDomain | null>;
    constructor(mlJobService: MlJobService, anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService, anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService, anomalyTimelineService: AnomalyTimelineService, timefilter: TimefilterContract);
    /**
     * Initializes required subscriptions for fetching swim lanes data.
     * @internal
     */
    protected _initSubscriptions(): Subscription;
    private _initViewByData;
    private _initSwimLanePagination;
    private _initOverallSwimLaneData;
    private _initTopFieldValues;
    private _initViewBySwimLaneData;
    private _initSelectedCells;
    /**
     * Adjust cell selection with respect to the time boundaries.
     * @return adjusted time selection or undefined if out of current range entirely.
     */
    private _getAdjustedTimeSelection;
    /**
     * Obtain the list of 'View by' fields per job and viewBySwimlaneFieldName
     * @internal
     *
     * TODO check for possible enhancements/refactoring. Has been moved from explorer_utils as-is.
     */
    private _getViewBySwimlaneOptions;
    /**
     * Provides overall swim lane data.
     */
    getOverallSwimLaneData$(): Observable<OverallSwimlaneData | null>;
    getViewBySwimLaneData$(): Observable<OverallSwimlaneData | undefined>;
    getContainerWidth$(): Observable<number | undefined>;
    getContainerWidth(): number | undefined;
    /**
     * Provides updates for swim lanes cells selection.
     */
    getSelectedCells$(): Observable<AppStateSelectedCells | undefined | null>;
    getSelectedCells(): AppStateSelectedCells | undefined | null;
    getSwimLaneSeverity$(): Observable<SeverityThreshold[]>;
    getSwimLaneSeverity(): SeverityThreshold[];
    getSwimLanePagination$(): Observable<SwimLanePagination>;
    getSwimLanePagination(): SwimLanePagination;
    setSwimLanePagination(update: Partial<SwimLanePagination>): void;
    getSwimLaneCardinality$(): Observable<number | undefined>;
    getViewBySwimlaneFieldName$(): Observable<string | undefined>;
    getViewBySwimLaneOptions$(): Observable<string[]>;
    /**
     * Currently selected jobs on the swim lane
     */
    getSwimLaneJobs$(): Observable<ExplorerJob[]>;
    getViewBySwimLaneOptions(): string[];
    isOverallSwimLaneLoading$(): Observable<boolean>;
    isViewBySwimLaneLoading$(): Observable<boolean>;
    /**
     * Sets container width
     * @param value
     */
    setContainerWidth(value: number): void;
    /**
     * Sets swim lanes severity.
     * Updates the URL state.
     * @param value
     */
    setSeverity(value: SeverityThreshold[]): void;
    /**
     * Sets selected cells.
     * @param swimLaneSelectedCells
     */
    setSelectedCells(swimLaneSelectedCells?: AppStateSelectedCells): void;
    /**
     * Updates View by swim lane value.
     * @param fieldName - Influencer field name of job id.
     */
    setViewBySwimLaneFieldName(fieldName: string): void;
    getSwimLaneBucketInterval$(): Observable<TimeBucketsInterval>;
    getSwimLaneBucketInterval(): TimeBucketsInterval | null;
}
export {};
