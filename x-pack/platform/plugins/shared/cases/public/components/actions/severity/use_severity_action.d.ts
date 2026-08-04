import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { CaseSeverity } from '../../../../common/types/domain';
import type { CasesUI } from '../../../../common';
import type { UseActionProps } from '../types';
interface UseSeverityActionProps extends UseActionProps {
    selectedSeverity?: CaseSeverity;
}
export declare const useSeverityAction: ({ onAction, onActionSuccess, isDisabled, selectedSeverity, }: UseSeverityActionProps) => {
    getActions: (selectedCases: CasesUI) => EuiContextMenuPanelItemDescriptor[];
    canUpdateSeverity: boolean;
};
export type UseSeverityAction = ReturnType<typeof useSeverityAction>;
export {};
