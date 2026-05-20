import type { FC } from 'react';
import type { DatafeedResponse, JobOverride, JobResponse, KibanaObject, KibanaObjectResponse, ModuleJob } from '@kbn/ml-common-types/modules';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export interface ModuleJobUI extends ModuleJob {
    datafeedResult?: DatafeedResponse;
    setupResult?: JobResponse;
}
export type KibanaObjectUi = KibanaObject & KibanaObjectResponse;
interface PageProps {
    moduleId: string;
    existingGroupIds: string[];
}
export type JobOverrides = Record<JobId, JobOverride>;
export declare enum SAVE_STATE {
    NOT_SAVED = 0,
    SAVING = 1,
    SAVED = 2,
    FAILED = 3,
    PARTIAL_FAILURE = 4
}
export declare const Page: FC<PageProps>;
export {};
