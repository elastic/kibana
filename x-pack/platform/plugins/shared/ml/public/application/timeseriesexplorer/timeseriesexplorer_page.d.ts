import type { FC, PropsWithChildren } from 'react';
interface TimeSeriesExplorerPageProps {
    dateFormatTz?: string;
    resizeRef?: any;
    noSingleMetricJobsFound?: boolean;
    handleJobSelectionChange: ({ jobIds, time, }: {
        jobIds: string[];
        time?: {
            from: string;
            to: string;
        };
    }) => void;
    selectedJobId?: string[];
}
export declare const TimeSeriesExplorerPage: FC<PropsWithChildren<TimeSeriesExplorerPageProps>>;
export {};
