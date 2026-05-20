import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { AnnotationsTable } from '@kbn/ml-common-types/annotations';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import type { MlApi } from '../services/ml_api_service';
import { StateService } from '../services/state_service';
/**
 * Dedicated state service for annotations.
 * - overallAnnotations$ drives the swimlane overlay
 * - annotationsTable$ drives the Annotations panel
 */
export declare class AnnotationsStateService extends StateService {
    private readonly mlApi;
    private readonly timefilter;
    private readonly anomalyExplorerCommonStateService;
    private readonly anomalyTimelineStateService;
    private readonly _overallAnnotations$;
    private readonly _annotationsTable$;
    private readonly _timeBounds$;
    private readonly _refreshSubject$;
    constructor(mlApi: MlApi, timefilter: TimefilterContract, anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService, anomalyTimelineStateService: AnomalyTimelineStateService);
    get overallAnnotations$(): Observable<AnnotationsTable>;
    get annotationsTable$(): Observable<AnnotationsTable>;
    get overallAnnotations(): AnnotationsTable;
    get annotationsTable(): AnnotationsTable;
    protected _initSubscriptions(): Subscription;
    private _loadOverallAnnotations;
}
