import type { FC } from 'react';
import type { JobOverride } from '@kbn/ml-common-types/modules';
import type { JobOverrides, ModuleJobUI } from '../page';
import { SAVE_STATE } from '../page';
interface ModuleJobsProps {
    jobs: ModuleJobUI[];
    jobPrefix: string;
    saveState: SAVE_STATE;
    existingGroupIds: string[];
    jobOverrides: JobOverrides;
    onJobOverridesChange: (job: JobOverride) => void;
}
export declare const SETUP_RESULTS_WIDTH = "200px";
export declare const ModuleJobs: FC<ModuleJobsProps>;
export {};
