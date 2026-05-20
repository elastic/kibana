import React from 'react';
import type { CaseUI } from '../../../common/ui/types';
import type { OnUpdateFields } from '../case_view/types';
export interface CaseActionBarProps {
    caseData: CaseUI;
    isLoading: boolean;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const CaseActionBar: React.NamedExoticComponent<CaseActionBarProps>;
