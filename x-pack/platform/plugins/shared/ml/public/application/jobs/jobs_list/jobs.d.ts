import type { FC } from 'react';
import type { ListingPageUrlState } from '@kbn/ml-url-state';
interface JobsPageProps {
    isMlEnabledInSpace?: boolean;
    lastRefresh?: number;
    refreshList: () => void;
}
export declare const getDefaultAnomalyDetectionJobsListState: () => ListingPageUrlState;
export declare const JobsPage: FC<JobsPageProps>;
export {};
