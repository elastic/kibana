import type { AllCasesSelectorModalProps } from '../../all_cases/selector_modal';
import type { CreateCaseFlyoutProps } from '../../create/flyout';
export declare const getInitialCasesContextState: () => CasesContextState;
export interface CasesContextState {
    createCaseFlyout: {
        isFlyoutOpen: boolean;
        props?: CreateCaseFlyoutProps;
    };
    selectCaseModal: {
        isModalOpen: boolean;
        props?: AllCasesSelectorModalProps;
    };
}
export declare enum CasesContextStoreActionsList {
    OPEN_CREATE_CASE_FLYOUT = 0,
    CLOSE_CREATE_CASE_FLYOUT = 1,
    OPEN_ADD_TO_CASE_MODAL = 2,
    CLOSE_ADD_TO_CASE_MODAL = 3
}
export type CasesContextStoreAction = {
    type: CasesContextStoreActionsList.OPEN_CREATE_CASE_FLYOUT;
    payload: CreateCaseFlyoutProps;
} | {
    type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT;
} | {
    type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL;
    payload: AllCasesSelectorModalProps;
} | {
    type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL;
};
export declare const casesContextReducer: React.Reducer<CasesContextState, CasesContextStoreAction>;
