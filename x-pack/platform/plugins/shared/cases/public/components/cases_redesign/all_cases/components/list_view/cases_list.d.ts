import React from 'react';
import type { Pagination } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CasesFindResponseUI, CaseUI } from '../../../../../../common/ui/types';
import type { CasesColumnSelection, EuiBasicTableOnChange } from '../../types';
interface CasesListProps {
    data: CasesFindResponseUI;
    userProfiles: Map<string, UserProfileWithAvatar>;
    isLoading: boolean;
    pagination: Pagination;
    onChange: (change: EuiBasicTableOnChange) => void;
    disableActions: boolean;
    selectedFields: CasesColumnSelection[];
    selectedCases: CaseUI[];
    onSelectionChange: (theCase: CaseUI, isSelected: boolean) => void;
    isSelectable: boolean;
}
export declare const CasesList: React.FC<CasesListProps>;
export {};
