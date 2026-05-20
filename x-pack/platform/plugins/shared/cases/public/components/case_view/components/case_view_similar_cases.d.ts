import React from 'react';
import type { CaseUI } from '../../../../common/ui/types';
interface CaseViewSimilarCasesProps {
    caseData: CaseUI;
    searchTerm?: string;
}
export declare const CaseViewSimilarCases: {
    ({ caseData, searchTerm }: CaseViewSimilarCasesProps): React.JSX.Element;
    displayName: string;
};
export {};
