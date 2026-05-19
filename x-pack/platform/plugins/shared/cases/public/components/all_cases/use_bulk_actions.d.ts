import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type { CasesUI } from '../../containers/types';
interface UseBulkActionsProps {
    selectedCases: CasesUI;
    onAction: () => void;
    onActionSuccess: () => void;
}
interface UseBulkActionsReturnValue {
    panels: EuiContextMenuPanelDescriptor[];
    modals: JSX.Element;
    flyouts: JSX.Element;
}
export declare const useBulkActions: ({ selectedCases, onAction, onActionSuccess, }: UseBulkActionsProps) => UseBulkActionsReturnValue;
export {};
