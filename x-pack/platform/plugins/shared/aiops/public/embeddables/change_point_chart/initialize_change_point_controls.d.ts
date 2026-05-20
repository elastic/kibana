import type { StateComparators } from '@kbn/presentation-publishing';
import type { ChangePointComponentApi } from './types';
import type { ChangePointEmbeddableState } from '../../../common/embeddables/change_point_chart/types';
type ChangePointEmbeddableCustomState = Omit<ChangePointEmbeddableState, 'time_range' | 'title' | 'description' | 'hide_title' | 'hide_border'>;
export declare const changePointComparators: StateComparators<ChangePointEmbeddableCustomState>;
export declare const initializeChangePointControls: (initialState: ChangePointEmbeddableState) => {
    api: ChangePointComponentApi;
    anyStateChange$: import("rxjs").Observable<undefined>;
    getLatestState: () => ChangePointEmbeddableCustomState;
    reinitializeState: (lastSavedState: ChangePointEmbeddableCustomState) => void;
};
export {};
