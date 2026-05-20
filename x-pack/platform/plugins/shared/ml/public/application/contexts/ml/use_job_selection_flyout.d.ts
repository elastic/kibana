import { type JobSelectionResult } from '../../components/job_selector/job_selector_flyout';
export type GetJobSelection = ReturnType<typeof useJobSelectionFlyout>;
/**
 * Hook for invoking Anomaly Detection jobs selection
 * inside the ML app.
 */
export declare function useJobSelectionFlyout(): (config?: {
    singleSelection?: boolean;
    withTimeRangeSelector?: boolean;
    timeseriesOnly?: boolean;
    selectedIds?: string[];
}) => Promise<JobSelectionResult>;
