import type { Observable } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { GlobalState, UrlStateService } from '@kbn/ml-url-state/src/url_state';
import type { AnomalyExplorerFilterUrlState } from '@kbn/ml-common-types/locator';
import { type ExplorerJob } from './explorer_utils';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';
import type { KQLFilterSettings } from './components/explorer_query_bar/explorer_query_bar';
import { StateService } from '../services/state_service';
import type { MlJobService } from '../services/job_service';
import type { GroupObj } from '../components/job_selector/job_selector';
export interface AnomalyExplorerState {
    selectedJobs: ExplorerJob[];
}
export type FilterSettings = Required<Pick<AnomalyExplorerFilterUrlState, 'filterActive' | 'filteredFields' | 'queryString'>> & Pick<AnomalyExplorerFilterUrlState, 'influencersFilterQuery'>;
/**
 * Anomaly Explorer common state.
 * Manages related values in the URL state and applies required formatting.
 */
export declare class AnomalyExplorerCommonStateService extends StateService {
    private anomalyExplorerUrlStateService;
    private globalUrlStateService;
    private mlJobsService;
    private _selectedJobs$;
    private _selectedGroups$;
    private _filterSettings$;
    private _invalidJobIds$;
    private _getDefaultFilterSettings;
    constructor(anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService, globalUrlStateService: UrlStateService<GlobalState>, mlJobsService: MlJobService);
    readonly selectedGroups$: Observable<GroupObj[]>;
    readonly invalidJobIds$: Observable<string[]>;
    readonly selectedJobs$: Observable<ExplorerJob[]>;
    readonly influencerFilterQuery$: Observable<InfluencersFilterQuery | undefined>;
    readonly filterSettings$: Observable<FilterSettings>;
    get selectedGroups(): GroupObj[];
    get invalidJobIds(): string[];
    get selectedJobs(): ExplorerJob[];
    get filterSettings(): FilterSettings;
    protected _initSubscriptions(): Subscription;
    private _processSelectedJobs;
    private _getInvalidJobIds;
    setSelectedJobs(jobIds: string[], time?: {
        from: string;
        to: string;
    }): void;
    setFilterSettings(update: KQLFilterSettings): void;
    clearFilterSettings(): void;
}
