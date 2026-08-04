import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { ChangePointEmbeddableCustomState } from './types';
export declare const changePointComparators: StateComparators<ChangePointEmbeddableCustomState>;
export declare const initializeChangePointControls: (initialState: ChangePointChartEmbeddableState) => {
    api: {
        viewType: BehaviorSubject<ChangePointDetectionViewType>;
        dataViewId: BehaviorSubject<string>;
        fn: BehaviorSubject<"avg" | "max" | "min" | "sum">;
        metricField: BehaviorSubject<string>;
        splitField: BehaviorSubject<string | undefined>;
        partitions: BehaviorSubject<string[] | undefined>;
        maxSeriesToPlot: BehaviorSubject<number>;
        updateUserInput: (update: ChangePointEmbeddableCustomState) => void;
    };
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => ChangePointEmbeddableCustomState;
    reinitializeState: (lastSavedState: ChangePointEmbeddableCustomState) => void;
};
