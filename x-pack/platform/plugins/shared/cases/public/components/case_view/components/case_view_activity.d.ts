import React from 'react';
import type { CaseUI } from '../../../../common';
import type { CasesNavigation } from '../../links';
export declare const CaseViewActivity: {
    ({ caseData, searchTerm, actionsNavigation, }: {
        caseData: CaseUI;
        actionsNavigation?: CasesNavigation<string, "configurable">;
        searchTerm?: string;
    }): React.JSX.Element;
    displayName: string;
};
