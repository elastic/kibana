import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export declare const useCreateADLinks: () => {
    createLinkWithUserDefaults: (location: string, jobList: MlSummaryJob[]) => string;
};
export type CreateLinkWithUserDefaults = ReturnType<typeof useCreateADLinks>['createLinkWithUserDefaults'];
