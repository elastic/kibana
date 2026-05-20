import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { CasesUI } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';
import type { UseActionProps } from '../types';
interface UseStatusActionProps extends UseActionProps {
    selectedStatus?: CaseStatuses;
}
export declare const useStatusAction: ({ onAction, onActionSuccess, isDisabled, selectedStatus, }: UseStatusActionProps) => {
    getActions: (selectedCases: CasesUI) => EuiContextMenuPanelItemDescriptor[];
    canUpdateStatus: boolean;
    handleUpdateCaseStatus: (selectedCases: CasesUI, status: CaseStatuses, closeReason?: string) => void;
    isUpdatingStatus: boolean;
};
export type UseStatusAction = ReturnType<typeof useStatusAction>;
export {};
