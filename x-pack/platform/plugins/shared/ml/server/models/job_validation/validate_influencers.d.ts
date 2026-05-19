import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
export declare function validateInfluencers(job: CombinedJob): Promise<({
    id: string;
    influencerSuggestion: string;
} | {
    id: string;
    influencerSuggestion?: undefined;
})[]>;
