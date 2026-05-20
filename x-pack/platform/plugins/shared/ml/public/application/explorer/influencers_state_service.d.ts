import type { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { MlApi } from '../services/ml_api_service';
import { StateService } from '../services/state_service';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
export type InfluencersByField = Record<string, Array<{
    influencerFieldValue: string;
    maxAnomalyScore: number;
    sumAnomalyScore: number;
}>>;
export declare class InfluencersStateService extends StateService {
    private readonly mlApi;
    private readonly timefilter;
    private readonly anomalyExplorerCommonStateService;
    private readonly anomalyTimelineStateService;
    private readonly _influencers$;
    private readonly _isLoading$;
    private readonly _timeBounds$;
    private readonly _refresh$;
    constructor(mlApi: MlApi, timefilter: TimefilterContract, anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService, anomalyTimelineStateService: AnomalyTimelineStateService);
    get influencers$(): Observable<InfluencersByField>;
    get influencers(): InfluencersByField;
    get isLoading$(): Observable<boolean>;
    protected _initSubscriptions(): Subscription;
    private _getTopInfluencers;
}
