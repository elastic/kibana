import type { StateComparators, TitlesApi } from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import type { SingleMetricViewerEmbeddableState, SingleMetricViewerEmbeddableUserInput } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
export type AnomalySwimLaneControlsState = Pick<SingleMetricViewerEmbeddableState, 'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription'>;
export type SingleMetricViewerControlsState = Pick<SingleMetricViewerEmbeddableState, 'jobIds' | 'selectedDetectorIndex' | 'selectedEntities' | 'functionDescription' | 'forecastId'>;
export declare const singleMetricViewerComparators: StateComparators<SingleMetricViewerControlsState>;
export declare const initializeSingleMetricViewerControls: (initialState: SingleMetricViewerEmbeddableState, titlesApi: TitlesApi) => {
    api: {
        jobIds: BehaviorSubject<string[]>;
        forecastId: BehaviorSubject<string | undefined>;
        selectedDetectorIndex: BehaviorSubject<number>;
        selectedEntities: BehaviorSubject<Record<string, any> | undefined>;
        functionDescription: BehaviorSubject<string | undefined>;
        updateForecastId: (id: string | undefined) => void;
        updateUserInput: (update: SingleMetricViewerEmbeddableUserInput) => void;
    };
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => SingleMetricViewerControlsState;
    reinitializeState: (lastSavedState: SingleMetricViewerControlsState) => void;
    cleanup: () => void;
};
