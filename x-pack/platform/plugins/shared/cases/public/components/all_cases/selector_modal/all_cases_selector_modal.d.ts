import React from 'react';
import type { CaseStatuses } from '../../../../common/types/domain';
import type { CaseUI } from '../../../../common/ui/types';
import { type GetAttachments } from './use_cases_add_to_existing_case_modal';
export interface AllCasesSelectorModalProps {
    hiddenStatuses?: CaseStatuses[];
    onRowClick?: (theCase?: CaseUI) => void;
    onClose?: (theCase?: CaseUI, isCreateCase?: boolean) => void;
    onCreateCaseClicked?: () => void;
    getAttachments?: GetAttachments;
}
export declare const AllCasesSelectorModal: React.NamedExoticComponent<AllCasesSelectorModalProps>;
