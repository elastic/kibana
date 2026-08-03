import React from 'react';
import type { CaseUI } from '../../../common/ui/types';
import type { CaseStatuses } from '../../../common/types/domain';
import { type GetAttachments } from './selector_modal/use_cases_add_to_existing_case_modal';
export interface AllCasesListProps {
    hiddenStatuses?: CaseStatuses[];
    isSelectorView?: boolean;
    onRowClick?: (theCase?: CaseUI, isCreateCase?: boolean) => void;
    getAttachments?: GetAttachments;
}
export declare const AllCasesList: React.NamedExoticComponent<AllCasesListProps>;
