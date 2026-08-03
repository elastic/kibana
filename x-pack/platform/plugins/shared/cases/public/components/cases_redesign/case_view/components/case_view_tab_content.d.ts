import type { FC } from 'react';
import type { CaseUI } from '../../../../../common';
import type { OnUpdateFields } from '../../../case_view/types';
interface CaseViewTabContentProps {
    caseData: CaseUI;
    searchTerm: string;
    onSearch: (term: string) => void;
    onUpdateField: (args: OnUpdateFields) => void;
}
export declare const CaseViewTabContent: FC<CaseViewTabContentProps>;
export {};
