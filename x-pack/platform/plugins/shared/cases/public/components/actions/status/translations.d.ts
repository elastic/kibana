export { MARK_CASE_IN_PROGRESS, OPEN_CASE, CLOSE_CASE } from '../../../common/translations';
export declare const CLOSED_CASES: ({ totalCases, caseTitle, }: {
    totalCases: number;
    caseTitle?: string;
}) => string;
export declare const CLOSED_CASES_SUMMARY: (closedAlertsCount: number, totalAlertsCount: number) => string;
export declare const SEE_ALERTS: string;
export declare const REOPENED_CASES: ({ totalCases, caseTitle, }: {
    totalCases: number;
    caseTitle?: string;
}) => string;
export declare const MARK_IN_PROGRESS_CASES: ({ totalCases, caseTitle, }: {
    totalCases: number;
    caseTitle?: string;
}) => string;
export declare const BULK_ACTION_STATUS_CLOSE: string;
export declare const BULK_ACTION_STATUS_OPEN: string;
export declare const BULK_ACTION_STATUS_IN_PROGRESS: string;
