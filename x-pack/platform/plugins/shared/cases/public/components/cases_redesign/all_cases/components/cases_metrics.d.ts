import React from 'react';
export interface CasesMetricsProps {
    /**
     * Counts and MTTR from the cases search response, so the stats bar reflects the same
     * search, filters, and date range as the table (https://github.com/elastic/security-team/issues/18001).
     */
    countOpenCases: number;
    countInProgressCases: number;
    countClosedCases: number;
    mttr: number | null | undefined;
    isLoading: boolean;
}
export declare const CasesMetrics: React.NamedExoticComponent<CasesMetricsProps>;
