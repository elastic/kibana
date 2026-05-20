import React from 'react';
import type { MlPages } from '@kbn/ml-common-types/locator_ml_pages';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { GroupObj } from '../job_selector';
import type { ExplorerJob } from '../../../explorer/explorer_utils';
export interface IdBadgesProps {
    limit: number;
    selectedGroups: GroupObj[];
    selectedJobIds: string[];
    onLinkClick: () => void;
    showAllBarBadges: boolean;
    page: MlPages;
    onRemoveJobId: (jobOrGroupId: string[]) => void;
    selectedJobs: MlSummaryJob[] | ExplorerJob[];
}
export declare function IdBadges({ limit, selectedGroups, onLinkClick, selectedJobIds, showAllBarBadges, page, onRemoveJobId, selectedJobs, }: IdBadgesProps): React.JSX.Element;
