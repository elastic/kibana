import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import type { AnomalyChartsEmbeddableRuntimeState, AnomalyChartsEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { AnomalyChartsComponentApi, AnomalyChartsDataLoadingApi } from '../types';
export declare const anomalyChartsComparators: StateComparators<AnomalyChartsEmbeddableRuntimeState>;
export declare const initializeAnomalyChartsControls: (initialState: AnomalyChartsEmbeddableState, titlesApi?: TitlesApi, parentApi?: unknown) => {
    api: AnomalyChartsComponentApi;
    dataLoadingApi: AnomalyChartsDataLoadingApi;
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => AnomalyChartsEmbeddableState;
    reinitializeState: (lastSavedState: AnomalyChartsEmbeddableState) => void;
    cleanup: () => void;
};
