import React from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { CaseUI } from '../../../../../../common/ui/types';
import type { CasesColumnSelection } from '../../types';
export declare const CaseListItem: React.FC<{
    theCase: CaseUI;
    userProfiles: Map<string, UserProfileWithAvatar>;
    disableActions: boolean;
    selectedFields: CasesColumnSelection[];
    isSelected: boolean;
    hasSelection: boolean;
    isSelectable: boolean;
    onSelectionChange: (theCase: CaseUI, isSelected: boolean) => void;
}>;
