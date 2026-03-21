export declare const buildGapsFilter: ({ start, end, statuses, hasUnfilledIntervals, hasInProgressIntervals, hasFilledIntervals, updatedBefore, failedAutoFillAttemptsLessThan, }: {
    start?: string;
    end?: string;
    statuses?: string[];
    hasUnfilledIntervals?: boolean;
    hasInProgressIntervals?: boolean;
    hasFilledIntervals?: boolean;
    updatedBefore?: string;
    failedAutoFillAttemptsLessThan?: number;
}) => string;
