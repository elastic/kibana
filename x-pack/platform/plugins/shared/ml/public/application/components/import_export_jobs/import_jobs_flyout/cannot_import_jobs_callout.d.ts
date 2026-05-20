import type { FC } from 'react';
import type { SkippedJobs } from './jobs_import_service';
interface Props {
    jobs: SkippedJobs[];
    autoExpand?: boolean;
}
export declare const CannotImportJobsCallout: FC<Props>;
export {};
