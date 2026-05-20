import type { FC } from 'react';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
export declare const EditQueryDelay: FC<{
    datafeedId: Datafeed['datafeed_id'];
    queryDelay: Datafeed['query_delay'];
    isEnabled: boolean;
}>;
