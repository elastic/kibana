import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { type WithAllKeys, type StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { FieldStatsInitialState } from '../grid_embeddable/types';
import type { FieldStatsControlsApi } from './types';
export declare const initializeFieldStatsControls: (initialState: FieldStatsInitialState, uiSettings: IUiSettingsClient) => {
    fieldStatsControlsApi: FieldStatsControlsApi;
    dataLoadingApi: {
        dataLoading$: BehaviorSubject<boolean | undefined>;
        blockingError$: BehaviorSubject<Error | undefined>;
        onRenderComplete: () => void;
        onLoading: (v: boolean) => void;
        onError: (error?: Error) => void;
    };
    fieldStatsStateManager: import("@kbn/presentation-publishing/state_manager/types").StateManager<FieldStatsInitialState>;
    resetData$: BehaviorSubject<number>;
    serializeFieldStatsChartState: () => WithAllKeys<FieldStatsInitialState>;
    fieldStatsControlsComparators: StateComparators<FieldStatsInitialState>;
    onFieldStatsTableDestroy: () => void;
};
