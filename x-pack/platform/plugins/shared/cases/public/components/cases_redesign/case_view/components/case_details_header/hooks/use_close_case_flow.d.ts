import { CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
import type { OnUpdateFields } from '../../../../../case_view/types';
interface UseCloseCaseFlowArgs {
    caseData: CaseUI;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const useCloseCaseFlow: ({ caseData, onUpdateField }: UseCloseCaseFlowArgs) => {
    onStatusChanged: (status: CaseStatuses) => void;
    closeCaseModal: JSX.Element | null;
};
export {};
