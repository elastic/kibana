import type { FC } from 'react';
import type { JobOverride } from '@kbn/ml-common-types/modules';
import type { ModuleJobUI } from '../page';
interface JobItemProps {
    job: ModuleJobUI;
    jobPrefix: string;
    jobOverride: JobOverride | undefined;
    isSaving: boolean;
    onEditRequest: (job: ModuleJobUI) => void;
}
export declare const JobItem: FC<JobItemProps>;
export {};
