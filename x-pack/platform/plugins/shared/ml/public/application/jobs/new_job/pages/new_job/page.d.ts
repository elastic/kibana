import type { FC } from 'react';
import { JOB_TYPE } from '../../../../../../common/constants/new_job';
import type { ExistingJobsAndGroups } from '../../../../services/job_service';
export interface PageProps {
    existingJobsAndGroups: ExistingJobsAndGroups;
    jobType: JOB_TYPE;
}
export declare const Page: FC<PageProps>;
