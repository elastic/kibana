import type { FC } from 'react';
import type { CaseUI } from '../../../../../../common';
import type { OnUpdateFields } from '../../../../case_view/types';
interface CaseDetailsAppHeaderProps {
    caseData: CaseUI;
    onUpdateField: (args: OnUpdateFields) => void;
    showMetrics: boolean;
    onShowMetricsChange: (enabled: boolean) => void;
}
export declare const CaseDetailsAppHeader: FC<CaseDetailsAppHeaderProps>;
export {};
