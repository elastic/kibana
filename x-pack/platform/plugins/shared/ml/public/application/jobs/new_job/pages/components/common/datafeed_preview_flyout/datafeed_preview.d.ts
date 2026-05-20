import type { FC } from 'react';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
export declare const DatafeedPreview: FC<{
    combinedJob: CombinedJob | null;
    heightOffset?: number;
    flyoutTitleId?: string;
}>;
