import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { FieldStatsInitialState } from '../../../../../common/embeddables/types';
type FieldStatsViewType = NonNullable<FieldStatsInitialState['view_type']>;
export declare const fieldStatsControlsComparators: StateComparators<FieldStatsInitialState>;
export declare const initializeFieldStatsControls: (initialState: FieldStatsInitialState, uiSettings: IUiSettingsClient) => {
    fieldStatsControlsApi: {
        updateUserInput: (update: FieldStatsInitialState, shouldResetData?: boolean) => void;
        query$: BehaviorSubject<{
            esql: string;
        } | undefined>;
        viewType$: BehaviorSubject<FieldStatsViewType>;
        dataViewId$: BehaviorSubject<string | undefined>;
        showDistributions$: BehaviorSubject<boolean>;
    };
    dataLoadingApi: {
        dataLoading$: BehaviorSubject<boolean | undefined>;
        blockingError$: BehaviorSubject<Error | undefined>;
        onRenderComplete: () => void;
        onLoading: (v: boolean) => void;
        onError: (error?: Error) => void;
    };
    fieldStatsStateManager: {
        anyStateChange$: import("rxjs").Observable<undefined>;
        reinitializeState: (nextState: FieldStatsInitialState) => void;
    };
    resetData$: BehaviorSubject<number>;
    serializeFieldStatsChartState: () => FieldStatsInitialState;
    fieldStatsControlsComparators: StateComparators<FieldStatsInitialState>;
    onFieldStatsTableDestroy: () => void;
};
export {};
