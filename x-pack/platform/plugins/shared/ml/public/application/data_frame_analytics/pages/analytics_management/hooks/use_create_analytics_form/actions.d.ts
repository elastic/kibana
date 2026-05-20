import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { DeepReadonly } from '@kbn/ml-common-types/common';
import type { FormMessage, State, SourceIndexMap } from './state';
export declare enum ACTION {
    ADD_REQUEST_MESSAGE = 0,
    RESET_REQUEST_MESSAGES = 1,
    CLOSE_MODAL = 2,
    OPEN_MODAL = 3,
    RESET_ADVANCED_EDITOR_MESSAGES = 4,
    RESET_FORM = 5,
    SET_ADVANCED_EDITOR_RAW_STRING = 6,
    SET_FORM_STATE = 7,
    SET_DATA_VIEW_TITLES = 8,
    SET_IS_JOB_CREATED = 9,
    SET_IS_JOB_STARTED = 10,
    SET_IS_MODAL_BUTTON_DISABLED = 11,
    SET_IS_MODAL_VISIBLE = 12,
    SET_JOB_CONFIG = 13,
    SET_JOB_IDS = 14,
    SWITCH_TO_ADVANCED_EDITOR = 15,
    SWITCH_TO_FORM = 16,
    SET_ESTIMATED_MODEL_MEMORY_LIMIT = 17,
    SET_JOB_CLONE = 18
}
export type Action = {
    type: ACTION.RESET_REQUEST_MESSAGES | ACTION.CLOSE_MODAL | ACTION.OPEN_MODAL | ACTION.RESET_ADVANCED_EDITOR_MESSAGES | ACTION.RESET_FORM | ACTION.SWITCH_TO_ADVANCED_EDITOR | ACTION.SWITCH_TO_FORM;
} | {
    type: ACTION.ADD_REQUEST_MESSAGE;
    requestMessage: FormMessage;
} | {
    type: ACTION.SET_ADVANCED_EDITOR_RAW_STRING;
    advancedEditorRawString: State['advancedEditorRawString'];
} | {
    type: ACTION.SET_FORM_STATE;
    payload: Partial<State['form']>;
} | {
    type: ACTION.SET_DATA_VIEW_TITLES;
    payload: {
        dataViewsMap: SourceIndexMap;
    };
} | {
    type: ACTION.SET_IS_JOB_CREATED;
    isJobCreated: State['isJobCreated'];
} | {
    type: ACTION.SET_IS_JOB_STARTED;
    isJobStarted: State['isJobStarted'];
} | {
    type: ACTION.SET_JOB_CONFIG;
    payload: State['jobConfig'];
} | {
    type: ACTION.SET_JOB_IDS;
    jobIds: State['jobIds'];
} | {
    type: ACTION.SET_ESTIMATED_MODEL_MEMORY_LIMIT;
    value: State['estimatedModelMemoryLimit'];
} | {
    type: ACTION.SET_JOB_CLONE;
    cloneJob: DeepReadonly<DataFrameAnalyticsConfig>;
};
export interface ActionDispatchers {
    closeModal: () => void;
    createAnalyticsJob: () => Promise<boolean>;
    initiateWizard: () => Promise<void>;
    resetAdvancedEditorMessages: () => void;
    setAdvancedEditorRawString: (payload: State['advancedEditorRawString']) => void;
    setFormState: (payload: Partial<State['form']>) => void;
    setJobConfig: (payload: State['jobConfig']) => void;
    startAnalyticsJob: () => void;
    switchToAdvancedEditor: () => void;
    switchToForm: () => void;
    setEstimatedModelMemoryLimit: (value: State['estimatedModelMemoryLimit']) => void;
    setJobClone: (cloneJob: DeepReadonly<DataFrameAnalyticsConfig>) => Promise<void>;
}
