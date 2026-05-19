import type { CasesUI, CaseUI } from '../../../common';
import type { UseActionProps, ItemsSelectionState } from './types';
type UseItemsActionProps<T> = UseActionProps & {
    fieldKey: 'tags' | 'assignees';
    successToasterTitle: (totalCases: number) => string;
    fieldSelector: (theCase: CaseUI) => string[];
    itemsTransformer: (items: string[]) => T;
};
export declare const useItemsAction: <T>({ isDisabled, fieldKey, onAction, onActionSuccess, successToasterTitle, fieldSelector, itemsTransformer, }: UseItemsActionProps<T>) => {
    isFlyoutOpen: boolean;
    onFlyoutClosed: () => void;
    onSaveItems: (itemsSelection: ItemsSelectionState) => void;
    openFlyout: (selectedCases: CasesUI) => void;
    isActionDisabled: boolean;
};
export type UseItemsAction = ReturnType<typeof useItemsAction>;
export {};
