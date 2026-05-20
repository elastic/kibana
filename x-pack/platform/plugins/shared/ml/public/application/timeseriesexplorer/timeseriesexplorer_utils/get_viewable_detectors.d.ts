import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
export interface ViewableDetector {
    index: number;
    detector_description: string | undefined;
    function: string;
}
export declare function getViewableDetectors(selectedJob: CombinedJob): ViewableDetector[];
