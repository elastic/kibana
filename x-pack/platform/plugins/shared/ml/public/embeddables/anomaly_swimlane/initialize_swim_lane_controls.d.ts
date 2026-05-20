import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import type { AnomalySwimLaneControlsState, AnomalySwimLaneEmbeddableState } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { AnomalySwimLaneComponentApi } from './types';
export declare const swimLaneComparators: StateComparators<AnomalySwimLaneControlsState>;
export declare const initializeSwimLaneControls: (initialState: AnomalySwimLaneEmbeddableState, titlesApi: TitlesApi) => {
    api: AnomalySwimLaneComponentApi;
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => AnomalySwimLaneControlsState;
    reinitializeState: (lastSavedState: AnomalySwimLaneControlsState) => void;
    cleanup: () => void;
};
