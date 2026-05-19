import type { IScopedClusterClient } from '@kbn/core/server';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { VALIDATION_STATUS } from '@kbn/ml-validators';
export declare function validateAnalyticsJob(client: IScopedClusterClient, job: DataFrameAnalyticsConfig): Promise<{
    id: string;
    text: string;
    status: VALIDATION_STATUS;
    heading: string;
}[]>;
